// src/domains/dispatch/dispatch.service.ts
import dispatchRepository from './dispatch.repository';
import { compileTemplate } from '../../common/utils/templateHelper';
import AppError from '../../common/errors/AppError';
import metadataRepository from '../metadata/metadata.repository';
import { PrismaError } from '../../types/common.types';
import { tokensToTemplate, MessageTemplateBody } from '../../types/template.types';
import {
  buildVariables,
  buildLocationsFormat,
  buildInstructorsFormat,
  buildMySchedulesFormat,
  getDayOfWeek,
  categoryKorean,
} from './dispatch.templateHelper';

class DispatchService {
  // 임시 배정 발송 일괄 발송 (부대별로 별도 발송, 날짜 범위 필터링)
  // 클라이언트가 actualDateRange를 전달하므로 서버는 그대로 사용
  async sendTemporaryDispatches(startDate?: string, endDate?: string) {
    // 템플릿 조회
    const template = await metadataRepository.findTemplateByKey('TEMPORARY');
    if (!template) {
      throw new AppError(
        '임시 배정 발송 템플릿(TEMPORARY)이 설정되지 않았습니다.',
        404,
        'TEMPLATE_NOT_FOUND',
      );
    }

    // 대상 조회 (클라이언트가 전달한 날짜 범위 적용)
    const targets = await dispatchRepository.findTargetsForTemporaryDispatch(startDate, endDate);
    if (targets.length === 0) {
      throw new AppError('발송할 대상(임시 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
    }

    // 그룹화 로직 (User ID + Unit ID 기준 - 부대별로 별도 발송)
    // key: "userId-unitId"
    // NOTE: unit은 이제 trainingPeriod를 통해 접근
    const groupMap = new Map<
      string,
      {
        user: (typeof targets)[0]['User'];
        trainingPeriod: (typeof targets)[0]['UnitSchedule']['trainingPeriod'];
        assignments: (typeof targets)[0][];
      }
    >();

    targets.forEach((assign) => {
      const trainingPeriod = assign.UnitSchedule.trainingPeriod;
      const unit = trainingPeriod.unit;
      const key = `${assign.userId}-${unit.id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          user: assign.User,
          trainingPeriod: trainingPeriod,
          assignments: [],
        });
      }
      groupMap.get(key)!.assignments.push(assign);
    });

    // N+1 문제 해결: 루프 전에 모든 유저-유닛 조합의 배정을 일괄 조회
    const userUnitPairs = Array.from(groupMap.values()).map(({ user, trainingPeriod }) => ({
      userId: user.id,
      unitId: trainingPeriod.unit.id,
    }));
    const allUserAssignmentsBatch =
      await dispatchRepository.findAllAssignmentsForUserUnits(userUnitPairs);

    // userId-unitId 키로 배정 그룹화 (메모리 내 필터링용)
    const assignmentsByUserUnit = new Map<string, typeof allUserAssignmentsBatch>();
    for (const assign of allUserAssignmentsBatch) {
      const unitId = assign.UnitSchedule.trainingPeriod?.unitId;
      if (!unitId) continue;
      const key = `${assign.userId}-${unitId}`;
      if (!assignmentsByUserUnit.has(key)) {
        assignmentsByUserUnit.set(key, []);
      }
      assignmentsByUserUnit.get(key)!.push(assign);
    }

    const dispatchesToCreate: Array<{
      type: 'Temporary';
      title: string;
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 발송 본문 생성 (템플릿 치환)
    for (const [, data] of groupMap) {
      const { user, trainingPeriod, assignments } = data;
      const unit = trainingPeriod.unit;

      // 본인 교육일정 목록 (self.schedules 변수용) + 날짜별 동료
      const scheduleDates = assignments.map((a) => {
        const dateValue = a.UnitSchedule.date;
        const d = dateValue ? new Date(dateValue) : new Date();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];

        // 해당 날짜(UnitSchedule)에 배정된 모든 강사들 (본인 포함)
        const allInstructors = a.UnitSchedule.assignments || [];

        // 정렬: 1순위 책임/총괄 (isTeamLeader), 2순위 등급 순
        const categoryOrder: Record<string, number> = {
          주강사: 1,
          부강사: 2,
          보조강사: 3,
          실습: 4,
        };

        const sortedInstructors = [...allInstructors].sort((ua1, ua2) => {
          const isLeader1 = ua1.User?.instructor?.isTeamLeader ? 0 : 1;
          const isLeader2 = ua2.User?.instructor?.isTeamLeader ? 0 : 1;
          if (isLeader1 !== isLeader2) return isLeader1 - isLeader2;

          const cat1 = ua1.User?.instructor?.category || '';
          const cat2 = ua2.User?.instructor?.category || '';
          return (categoryOrder[cat1] || 99) - (categoryOrder[cat2] || 99);
        });

        // 이름(등급) 형식으로 변환 - 공통 categoryKorean 사용
        const instructorNames = sortedInstructors
          .map((ua) => {
            const name = ua.User?.name || '';
            let category = ua.User?.instructor?.category || '';
            category = categoryKorean[category] || category.replace('강사', '');
            return category ? `${name}(${category})` : name;
          })
          .filter((text) => text)
          .join(', ');

        // 날짜 형식: MM-DD (연도 제외)
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const monthDay = dateStr.slice(5); // MM-DD

        return {
          name: user.name || '',
          date: monthDay,
          dayOfWeek,
          instructors: instructorNames,
        };
      });

      // 기본 변수들 (헬퍼 사용) - unit에 trainingPeriod와 schedules 정보 첨부
      const unitWithPeriod = {
        ...unit,
        trainingPeriod: trainingPeriod,
        schedules: trainingPeriod.schedules || [],
        trainingLocations: trainingPeriod.locations || [],
      };
      const variables = buildVariables(user, unitWithPeriod);

      // 장소 목록 (locations 포맷 변수) - 이제 trainingPeriod.locations
      const locationsList = buildLocationsFormat(trainingPeriod.locations || []);

      // 본인 일정 (self.mySchedules) - 해당 부대의 모든 배정 일정 (배치 조회 결과에서 필터링)
      const userUnitKey = `${user.id}-${unit.id}`;
      const allUserAssignments = assignmentsByUserUnit.get(userUnitKey) || [];
      const mySchedulesList = buildMySchedulesFormat(
        allUserAssignments.map((a) => ({ date: a.UnitSchedule.date ?? new Date() })),
        user.name || '',
      );

      // 템플릿 치환 (포맷 변수 포함) - JSONB body를 문자열로 변환
      // scheduleLocations 추가 - 날짜별 장소 정보
      type ScheduleWithLocations = {
        date?: Date | null;
        scheduleLocations?: Array<{
          actualCount?: number | null;
          plannedCount?: number | null;
          location?: {
            originalPlace?: string | null;
            hasInstructorLounge?: boolean | null;
            hasWomenRestroom?: boolean | null;
            note?: string | null;
          } | null;
        }>;
      };
      const scheduleLocationsForFormat = (trainingPeriod.schedules || []).flatMap(
        (schedule: ScheduleWithLocations) => {
          const scheduleDate = schedule.date ? new Date(schedule.date) : new Date();
          const dateStr = scheduleDate.toISOString().split('T')[0];
          const dayOfWeek = getDayOfWeek(scheduleDate);
          return (schedule.scheduleLocations || []).map((sl) => ({
            date: dateStr,
            dayOfWeek,
            placeName: sl.location?.originalPlace || '-',
            actualCount: String(sl.actualCount ?? 0),
            plannedCount: String(sl.plannedCount ?? 0),
            hasInstructorLounge: sl.location?.hasInstructorLounge ? 'O' : 'X',
            hasWomenRestroom: sl.location?.hasWomenRestroom ? 'O' : 'X',
            note: sl.location?.note || '',
          }));
        },
      );

      const templateBodyStr = tokensToTemplate(
        (template.body as unknown as MessageTemplateBody).tokens,
      );
      const body = this.compileTemplateWithFormat(templateBodyStr, variables, {
        'self.schedules': scheduleDates,
        'self.mySchedules': mySchedulesList,
        locations: locationsList,
        scheduleLocations: scheduleLocationsForFormat,
      });

      // 제목도 변수 치환 (단순 변수만, 포맷 없음)
      const title = compileTemplate(template.title || '', variables);

      dispatchesToCreate.push({
        type: 'Temporary',
        title,
        body,
        userId: user.id,
        // 해당 부대의 모든 배정 ID 포함 (수락/거절 시 부대 단위로 처리)
        assignmentIds: allUserAssignments.map((a) => a.unitScheduleId),
      });
    }

    // 저장 (Repo 위임)
    const count = await dispatchRepository.createDispatchesBulk(dispatchesToCreate);

    // 유니크 강사(userId) 수 계산
    const uniqueUserIds = new Set(dispatchesToCreate.map((d) => d.userId));
    const uniqueUserCount = uniqueUserIds.size;

    return {
      count,
      uniqueUserCount,
      message: `${uniqueUserCount}명의 강사에게 ${count}건의 임시 발송이 완료되었습니다.`,
    };
  }

  // 포맷 변수를 지원하는 템플릿 컴파일
  private compileTemplateWithFormat(
    templateBody: string,
    variables: Record<string, string>,
    formatVariables: Record<string, Array<Record<string, string>>>,
  ): string {
    let result = templateBody;

    // 일반 변수 치환
    result = compileTemplate(result, variables);

    // 포맷 변수 치환 (예: {{self.schedules:format=- {date} ({dayOfWeek})}})
    result = result.replace(
      /\{\{(\w+(?:\.\w+)?):format=([\s\S]*?)\}\}(?=[^}]|$)/g,
      (_, key, format) => {
        const items = formatVariables[key];
        if (!items || items.length === 0) return '';

        // 이스케이프된 \n을 실제 줄바꿈으로 변환
        const unescapedFormat = format.replace(/\\n/g, '\n');

        return items
          .map((item) => {
            let line = unescapedFormat;
            for (const [placeholder, value] of Object.entries(item)) {
              line = line.replace(new RegExp(`\\{\\s*${placeholder}\\s*\\}`, 'g'), value);
            }
            return line;
          })
          .join('\n');
      },
    );

    return result;
  }

  // 확정 배정 발송 일괄 발송 (날짜 범위 필터링)
  async sendConfirmedDispatches(startDate?: string, endDate?: string) {
    // 템플릿 조회
    const leaderTemplate = await metadataRepository.findTemplateByKey('CONFIRMED_LEADER');
    const memberTemplate = await metadataRepository.findTemplateByKey('CONFIRMED_MEMBER');

    if (!leaderTemplate || !memberTemplate) {
      throw new AppError(
        '확정 배정 템플릿(Leader/Member)이 설정되지 않았습니다.',
        404,
        'TEMPLATE_NOT_FOUND',
      );
    }

    // 대상 조회 (날짜 범위 적용)
    const targets = await dispatchRepository.findTargetsForConfirmedDispatch(startDate, endDate);
    if (targets.length === 0) {
      throw new AppError('발송할 대상(확정 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
    }

    // 그룹화 (User ID + Unit ID 기준 - 부대별로 별도 발송)
    // NOTE: unit은 이제 trainingPeriod를 통해 접근
    const groupMap = new Map<
      string,
      {
        user: (typeof targets)[0]['User'];
        trainingPeriod: (typeof targets)[0]['UnitSchedule']['trainingPeriod'];
        assignments: (typeof targets)[0][];
      }
    >();

    targets.forEach((assign) => {
      const trainingPeriod = assign.UnitSchedule.trainingPeriod;
      const unit = trainingPeriod.unit;
      const key = `${assign.userId}-${unit.id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          user: assign.User,
          trainingPeriod: trainingPeriod,
          assignments: [],
        });
      }
      groupMap.get(key)!.assignments.push(assign);
    });

    const dispatchesToCreate: Array<{
      type: 'Confirmed';
      title: string;
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 발송 본문 생성
    for (const [, data] of groupMap) {
      const { user, trainingPeriod, assignments } = data;
      const unit = trainingPeriod.unit;
      const userId = user.id;
      // 팀장 판단: role이 Head 또는 Supervisor면 리더용 템플릿
      const isLeader = assignments.some((a) => a.role === 'Head' || a.role === 'Supervisor');

      // 리더용/일반용 템플릿 선택
      const targetTemplate = isLeader ? leaderTemplate : memberTemplate;

      // 기본 변수들 (헬퍼 사용 - assignments 전달해서 position 계산)
      // unit에 trainingPeriod와 schedules 정보 첨부
      const unitWithPeriod = {
        ...unit,
        trainingPeriod: trainingPeriod,
        schedules: trainingPeriod.schedules || [],
        trainingLocations: trainingPeriod.locations || [],
      };
      const variables = buildVariables(user, unitWithPeriod, assignments);

      // 장소 목록 (locations 포맷 변수) - 이제 trainingPeriod.locations
      const locationsList = buildLocationsFormat(trainingPeriod.locations || []);

      // 일정 목록 (self.schedules 포맷 변수) - 이제 trainingPeriod.schedules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schedulesList = ((trainingPeriod.schedules || []) as any[])
        .filter((schedule: { assignments?: unknown[] }) => (schedule.assignments || []).length > 0)
        .map(
          (schedule: {
            date: Date | null;
            assignments?: { User?: { name?: string; instructor?: { category?: string } } }[];
          }) => {
            const scheduleDate = schedule.date ? new Date(schedule.date) : new Date();
            const dateStr = scheduleDate.toISOString().split('T')[0];
            const dayOfWeek = getDayOfWeek(scheduleDate);

            const instructorNames = (schedule.assignments || [])
              .map((a) => {
                const name = a.User?.name || '';
                let category = a.User?.instructor?.category || '';
                category = categoryKorean[category] || category.replace('강사', '');
                return category ? `${name}(${category})` : name;
              })
              .filter(Boolean)
              .join(', ');
            return {
              date: dateStr,
              dayOfWeek,
              instructors: instructorNames || '-',
            };
          },
        );

      // 본인 일정 (self.mySchedules)
      const mySchedulesList = buildMySchedulesFormat(
        assignments.map((a) => ({ date: a.UnitSchedule.date ?? new Date() })),
        user.name || '',
      );

      // 템플릿 치환 (포맷 변수 포함) - JSONB body를 문자열로 변환
      const targetBodyStr = tokensToTemplate(
        (targetTemplate.body as unknown as MessageTemplateBody).tokens,
      );

      // 강사 목록 (instructors 포맷 변수)
      // TrainingPeriod 전체의 확정된 강사들을 수집 (중복 제거)
      const instructorMap = new Map<number, any>();
      (trainingPeriod.schedules || []).forEach((schedule: any) => {
        (schedule.assignments || []).forEach((assignment: any) => {
          if (assignment.state === 'Accepted' && assignment.User) {
            instructorMap.set(assignment.User.id, assignment.User);
          }
        });
      });

      // 강사 정렬 및 포맷팅 데이터 구성
      const instructorList = Array.from(instructorMap.values())
        .map((user: any) => ({
          name: user.name,
          phone: user.userphoneNumber,
          category: user.instructor?.category,
          virtues: user.instructor?.virtues,
          // 정렬용 필드 (내부 사용)
          isTeamLeader: user.instructor?.isTeamLeader,
        }))
        .sort((a, b) => {
          // 1. 팀장 우선
          if (a.isTeamLeader !== b.isTeamLeader)
            return (b.isTeamLeader ? 1 : 0) - (a.isTeamLeader ? 1 : 0);
          // 2. 등급 순 (주 > 부 > 보조 > 실습)
          const categoryOrder: Record<string, number> = {
            Main: 1,
            주강사: 1,
            Sub: 2,
            부강사: 2,
            Assistant: 3,
            보조강사: 3,
            Practicum: 4,
            실습강사: 4,
          };
          const catA = categoryOrder[a.category || ''] || 99;
          const catB = categoryOrder[b.category || ''] || 99;
          return catA - catB;
        });

      const instructorsFormatList = buildInstructorsFormat(instructorList);

      // scheduleLocations 포맷 데이터 구성 - 날짜별 장소 정보
      type ScheduleWithLocationsConfirmed = {
        date?: Date | null;
        scheduleLocations?: Array<{
          actualCount?: number | null;
          plannedCount?: number | null;
          location?: {
            originalPlace?: string | null;
            hasInstructorLounge?: boolean | null;
            hasWomenRestroom?: boolean | null;
            note?: string | null;
          } | null;
        }>;
      };
      const scheduleLocationsForFormat = (trainingPeriod.schedules || []).flatMap(
        (schedule: ScheduleWithLocationsConfirmed) => {
          const scheduleDate = schedule.date ? new Date(schedule.date) : new Date();
          const dateStr = scheduleDate.toISOString().split('T')[0];
          const dayOfWeek = getDayOfWeek(scheduleDate);
          return (schedule.scheduleLocations || []).map((sl) => ({
            date: dateStr,
            dayOfWeek,
            placeName: sl.location?.originalPlace || '-',
            actualCount: String(sl.actualCount ?? 0),
            plannedCount: String(sl.plannedCount ?? 0),
            hasInstructorLounge: sl.location?.hasInstructorLounge ? 'O' : 'X',
            hasWomenRestroom: sl.location?.hasWomenRestroom ? 'O' : 'X',
            note: sl.location?.note || '',
          }));
        },
      );

      const body = this.compileTemplateWithFormat(targetBodyStr, variables, {
        locations: locationsList,
        'self.schedules': schedulesList,
        'self.mySchedules': mySchedulesList,
        instructors: instructorsFormatList,
        scheduleLocations: scheduleLocationsForFormat,
      });

      // 제목도 변수 치환 (단순 변수만, 포맷 없음)
      const title = compileTemplate(targetTemplate.title || '', variables);

      dispatchesToCreate.push({
        type: 'Confirmed',
        title,
        body,
        userId: userId,
        assignmentIds: assignments.map((a) => a.unitScheduleId),
      });
    }

    // 저장
    const count = await dispatchRepository.createDispatchesBulk(dispatchesToCreate);
    return { createdCount: count, message: `${count}건의 확정 발송이 완료되었습니다.` };
  }

  // 내 발송함 조회 (페이지네이션 지원) - 단순화된 스키마 사용
  async getMyDispatches(
    userId: number,
    options: {
      type?: 'Temporary' | 'Confirmed';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const {
      dispatches: dispatchList,
      total,
      page,
      limit,
    } = await dispatchRepository.findMyDispatches(userId, options);

    const dispatches = dispatchList.map((d) => ({
      dispatchId: d.id,
      type: d.type,
      title: d.title,
      status: d.status,
      body: d.body,
      receivedAt: d.createdAt,
      readAt: d.readAt,
      isRead: !!d.readAt,
      // 연결된 배정 정보 (응답용)
      assignments:
        d.assignments?.map((da) => ({
          unitScheduleId: da.assignment.unitScheduleId,
          state: da.assignment.state,
        })) || [],
    }));

    return {
      dispatches,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // 발송 읽음 처리
  async readDispatch(userId: number, dispatchId: number | string) {
    try {
      // Prisma update는 조건에 맞는 레코드가 없으면 에러(P2025)를 던짐
      await dispatchRepository.markAsRead(userId, Number(dispatchId));
      return { success: true };
    } catch (error) {
      // Prisma 에러 코드 P2025: Record to update not found
      if ((error as PrismaError).code === 'P2025') {
        throw new AppError(
          '해당 발송을 찾을 수 없거나 권한이 없습니다.',
          404,
          'DISPATCH_NOT_FOUND',
        );
      }
      // 그 외 에러는 상위로 전파
      throw error;
    }
  }
}

export default new DispatchService();
