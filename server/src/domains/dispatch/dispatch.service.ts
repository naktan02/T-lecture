// src/domains/dispatch/dispatch.service.ts
import dispatchRepository from './dispatch.repository';
import { compileTemplate } from '../../common/utils/templateHelper';
import AppError from '../../common/errors/AppError';
import metadataRepository from '../metadata/metadata.repository';
import { PrismaError } from '../../types/common.types';
import { UserDispatchGroup } from '../../types/dispatch.types';
import { tokensToTemplate, MessageTemplateBody } from '../../types/template.types';
import {
  buildVariables,
  buildLocationsFormat,
  buildInstructorsFormat,
  buildMySchedulesFormat,
} from './dispatch.templateHelper';

class DispatchService {
  // 임시 배정 발송 일괄 발송 (부대별로 별도 발송, 날짜 범위 필터링)
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

    // 대상 조회 (날짜 범위 적용)
    const targets = await dispatchRepository.findTargetsForTemporaryDispatch(startDate, endDate);
    if (targets.length === 0) {
      throw new AppError('발송할 대상(임시 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
    }

    // 그룹화 로직 (User ID + Unit ID 기준 - 부대별로 별도 발송)
    // key: "userId-unitId"
    const groupMap = new Map<
      string,
      {
        user: (typeof targets)[0]['User'];
        unit: (typeof targets)[0]['UnitSchedule']['unit'];
        assignments: (typeof targets)[0][];
      }
    >();

    targets.forEach((assign) => {
      const key = `${assign.userId}-${assign.UnitSchedule.unit.id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          user: assign.User,
          unit: assign.UnitSchedule.unit,
          assignments: [],
        });
      }
      groupMap.get(key)!.assignments.push(assign);
    });

    const dispatchesToCreate: Array<{
      type: 'Temporary';
      title: string;
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 발송 본문 생성 (템플릿 치환)
    for (const [, data] of groupMap) {
      const { user, unit, assignments } = data;

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

        // 이름(등급) 형식으로 변환 - 영어→한글 변환
        const categoryKorean: Record<string, string> = {
          Main: '주',
          Sub: '부',
          Assistant: '보조',
          Trainee: '실습',
          주강사: '주',
          부강사: '부',
          보조강사: '보조',
          실습강사: '실습',
        };
        const instructorNames = sortedInstructors
          .map((ua) => {
            const name = ua.User?.name || '';
            let category = ua.User?.instructor?.category || '';
            // 영어 또는 한글 → 축약형 한글 변환
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

      // 기본 변수들 (헬퍼 사용)
      const variables = buildVariables(user, unit);

      // 장소 목록 (locations 포맷 변수)
      const locationsList = buildLocationsFormat(unit.trainingLocations || []);

      // 본인 일정 (self.mySchedules)
      const mySchedulesList = buildMySchedulesFormat(
        assignments.map((a) => ({ date: a.UnitSchedule.date ?? new Date() })),
        user.name || '',
      );

      // 템플릿 치환 (포맷 변수 포함) - JSONB body를 문자열로 변환
      const templateBodyStr = tokensToTemplate(
        (template.body as unknown as MessageTemplateBody).tokens,
      );
      const body = this.compileTemplateWithFormat(templateBodyStr, variables, {
        'self.schedules': scheduleDates,
        'self.mySchedules': mySchedulesList,
        locations: locationsList,
      });

      // 제목도 변수 치환 (단순 변수만, 포맷 없음)
      const title = compileTemplate(template.title || '', variables);

      dispatchesToCreate.push({
        type: 'Temporary',
        title,
        body,
        userId: user.id,
        assignmentIds: assignments.map((a) => a.unitScheduleId),
      });
    }

    // 저장 (Repo 위임)
    const count = await dispatchRepository.createDispatchesBulk(dispatchesToCreate);
    return { count, message: `${count}건의 임시 발송이 완료되었습니다.` };
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

        return items
          .map((item) => {
            let line = format;
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

  // 확정 배정 발송 일괄 발송
  async sendConfirmedDispatches() {
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

    // 대상 조회
    const targets = await dispatchRepository.findTargetsForConfirmedDispatch();
    if (targets.length === 0) {
      throw new AppError('발송할 대상(확정 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
    }

    // 그룹화
    const userMap = new Map<number, UserDispatchGroup>();
    targets.forEach((assign) => {
      const userId = assign.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, { user: assign.User, assignments: [] });
      }
      userMap.get(userId)!.assignments.push(assign);
    });

    const dispatchesToCreate: Array<{
      type: 'Confirmed';
      title: string;
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 발송 본문 생성
    for (const [userId, data] of userMap) {
      const { user, assignments } = data;
      const representative = assignments[0];
      const unit = representative.UnitSchedule.unit;
      // 팀장 판단: role이 Head 또는 Supervisor면 리더용 템플릿
      const isLeader = assignments.some((a) => a.role === 'Head' || a.role === 'Supervisor');

      // 리더용/일반용 템플릿 선택
      const targetTemplate = isLeader ? leaderTemplate : memberTemplate;

      // 기본 변수들 (헬퍼 사용 - assignments 전달해서 position 계산)
      const variables = buildVariables(user, unit, assignments);

      // 장소 목록 (locations 포맷 변수)
      const locationsList = buildLocationsFormat(unit.trainingLocations || []);

      // 일정 목록 (self.schedules 포맷 변수)
      const getDayOfWeek = (date: Date): string => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return days[date.getDay()];
      };

      const schedulesList = (unit.schedules || [])
        .filter((schedule: { assignments?: unknown[] }) => (schedule.assignments || []).length > 0)
        .map(
          (schedule: {
            date: Date;
            assignments?: { User?: { name?: string; instructor?: { category?: string } } }[];
          }) => {
            const scheduleDate = new Date(schedule.date);
            const dateStr = scheduleDate.toISOString().split('T')[0];
            const dayOfWeek = getDayOfWeek(scheduleDate);

            // 카테고리 한글 축약
            const categoryKorean: Record<string, string> = {
              Main: '주',
              Co: '부',
              Assistant: '보조',
              Practicum: '실습',
              주강사: '주',
              부강사: '부',
              보조강사: '보조',
              실습강사: '실습',
            };

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
      // 부대 전체의 확정된 강사들을 수집 (중복 제거)
      const instructorMap = new Map<number, any>();
      (unit.schedules || []).forEach((schedule: any) => {
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

      const body = this.compileTemplateWithFormat(targetBodyStr, variables, {
        locations: locationsList,
        'self.schedules': schedulesList,
        'self.mySchedules': mySchedulesList,
        instructors: instructorsFormatList,
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
