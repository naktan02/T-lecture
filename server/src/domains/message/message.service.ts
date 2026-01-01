// src/domains/message/message.service.ts
import messageRepository from './message.repository';
import { compileTemplate } from '../../common/utils/templateHelper';
import AppError from '../../common/errors/AppError';
import metadataRepository from '../metadata/metadata.repository';
import { PrismaError } from '../../types/common.types';
import { UserMessageGroup } from '../../types/message.types';
import { tokensToTemplate, MessageTemplateBody } from '../../types/template.types';

class MessageService {
  // 임시 배정 메시지 일괄 발송 (부대별로 별도 메시지)
  async sendTemporaryMessages() {
    // 템플릿 조회
    const template = await metadataRepository.findTemplateByKey('TEMPORARY');
    if (!template) {
      throw new AppError(
        '임시 배정 메시지 템플릿(TEMPORARY)이 설정되지 않았습니다.',
        404,
        'TEMPLATE_NOT_FOUND',
      );
    }

    // 대상 조회
    const targets = await messageRepository.findTargetsForTemporaryMessage();
    if (targets.length === 0) {
      throw new AppError('발송할 대상(임시 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
    }

    // 그룹화 로직 (User ID + Unit ID 기준 - 부대별로 별도 메시지)
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

    const messagesToCreate: Array<{
      type: 'Temporary';
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 메시지 본문 생성 (템플릿 치환)
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

        // 이름(등급) 형식으로 변환 - "강사" 제거
        const instructorNames = sortedInstructors
          .map((ua) => {
            const name = ua.User?.name || '';
            let category = ua.User?.instructor?.category || '';
            // "강사" 제거: 주강사 → 주, 부강사 → 부, 보조강사 → 보조
            category = category.replace('강사', '');
            return category ? `${name}(${category})` : name;
          })
          .filter((text) => text)
          .join(', ');

        return {
          name: user.name || '',
          date: d.toISOString().split('T')[0],
          dayOfWeek,
          instructors: instructorNames,
        };
      });

      // 기본 변수들
      const variables: Record<string, string> = {
        // Legacy 호환
        userName: user.name || '',
        unitName: unit.name || '',
        region: unit.region || '',
        // 새 변수 체계
        'self.name': user.name || '',
        'self.phone': user.userphoneNumber || '',
        'unit.name': unit.name || '',
        'unit.region': unit.region || '',
        'unit.wideArea': unit.wideArea || '',
        'unit.addressDetail': unit.addressDetail || '',
        'unit.officerName': unit.officerName || '',
        'unit.officerPhone': unit.officerPhone || '',
      };

      // self.schedules 포맷 변수 처리 - JSONB body를 문자열로 변환
      const templateBodyStr = tokensToTemplate(
        (template.body as unknown as MessageTemplateBody).tokens,
      );
      const body = this.compileTemplateWithFormat(templateBodyStr, variables, {
        'self.schedules': scheduleDates,
      });

      messagesToCreate.push({
        type: 'Temporary',
        body,
        userId: user.id,
        assignmentIds: assignments.map((a) => a.unitScheduleId),
      });
    }

    // 저장 (Repo 위임)
    const count = await messageRepository.createMessagesBulk(messagesToCreate);
    return { count, message: `${count}건의 임시 메시지가 발송되었습니다.` };
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
    result = result.replace(/\{\{(\w+(?:\.\w+)?):format=([^}]+)\}\}/g, (_, key, format) => {
      const items = formatVariables[key];
      if (!items || items.length === 0) return '';

      return items
        .map((item) => {
          let line = format;
          for (const [placeholder, value] of Object.entries(item)) {
            line = line.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
          }
          return line;
        })
        .join('\n');
    });

    return result;
  }

  // 확정 배정 메시지 일괄 발송
  async sendConfirmedMessages() {
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
    const targets = await messageRepository.findTargetsForConfirmedMessage();
    if (targets.length === 0) {
      throw new AppError('발송할 대상(확정 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
    }

    // 그룹화
    const userMap = new Map<number, UserMessageGroup>();
    targets.forEach((assign) => {
      const userId = assign.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, { user: assign.User, assignments: [] });
      }
      userMap.get(userId)!.assignments.push(assign);
    });

    const messagesToCreate: Array<{
      type: 'Confirmed';
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 메시지 본문 생성
    for (const [userId, data] of userMap) {
      const { user, assignments } = data;
      const representative = assignments[0];
      const unit = representative.UnitSchedule.unit;
      const unitSchedule = representative.UnitSchedule;
      const isLeader = user.instructor?.isTeamLeader;

      // 리더용/일반용 템플릿 선택
      const targetTemplate = isLeader ? leaderTemplate : memberTemplate;

      // 변수 준비
      const variables: Record<string, string> = {
        userName: user.name || '',
        unitName: unit.name || '',
        address: unit.addressDetail || '',
        // 새 변수 체계
        'self.name': user.name || '',
        'self.phone': user.userphoneNumber || '',
        'unit.name': unit.name || '',
        'unit.addressDetail': unit.addressDetail || '',
      };

      // 장소 목록 (teamLeader용 포맷 변수)
      const locationsList = unit.trainingLocations.map((loc, idx) => ({
        index: String(idx + 1),
        placeName: loc.originalPlace || '',
        actualCount: String(loc.actualCount || 0),
        hasInstructorLounge: loc.hasInstructorLounge ? 'O' : 'X',
        hasWomenRestroom: loc.hasWomenRestroom ? 'O' : 'X',
        allowsPhoneBeforeAfter: loc.allowsPhoneBeforeAfter || '',
        note: loc.note || '',
      }));

      // 템플릿 치환 (포맷 변수 포함) - JSONB body를 문자열로 변환
      const targetBodyStr = tokensToTemplate(
        (targetTemplate.body as unknown as MessageTemplateBody).tokens,
      );
      const body = this.compileTemplateWithFormat(targetBodyStr, variables, {
        locations: locationsList,
      });

      messagesToCreate.push({
        type: 'Confirmed',
        body,
        userId: userId,
        assignmentIds: assignments.map((a) => a.unitScheduleId),
      });
    }

    // 저장
    const count = await messageRepository.createMessagesBulk(messagesToCreate);
    return { count, message: `${count}건의 확정 메시지가 발송되었습니다.` };
  }

  // 내 메시지함 조회
  async getMyMessages(userId: number) {
    const receipts = await messageRepository.findMyMessages(userId);
    return receipts.map((r) => ({
      messageId: r.message.id,
      type: r.message.type,
      title: r.message.title,
      status: r.message.status,
      body: r.message.body,
      receivedAt: r.message.createdAt,
      readAt: r.readAt,
      isRead: !!r.readAt,
      // 연결된 배정 정보 (응답용)
      assignments:
        r.message.assignments?.map((ma) => ({
          unitScheduleId: ma.assignment.unitScheduleId,
          state: ma.assignment.state,
        })) || [],
    }));
  }

  // 메시지 읽음 처리
  async readMessage(userId: number, messageId: number | string) {
    try {
      // Prisma update는 조건에 맞는 레코드가 없으면 에러(P2025)를 던짐
      await messageRepository.markAsRead(userId, Number(messageId));
      return { success: true };
    } catch (error) {
      // Prisma 에러 코드 P2025: Record to update not found
      if ((error as PrismaError).code === 'P2025') {
        throw new AppError(
          '해당 메시지를 찾을 수 없거나 권한이 없습니다.',
          404,
          'MESSAGE_NOT_FOUND',
        );
      }
      // 그 외 에러는 상위로 전파
      throw error;
    }
  }

  // 공지사항 작성
  async createNotice(title: string, body: string) {
    if (!title || !body) {
      throw new AppError('제목과 본문을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }
    return await messageRepository.createNotice({ title, body });
  }

  // 공지사항 목록 조회
  async getNotices() {
    return await messageRepository.findAllNotices();
  }
}

export default new MessageService();

// CommonJS 호환
module.exports = new MessageService();
