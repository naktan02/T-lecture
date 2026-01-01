// src/domains/message/message.service.ts
import messageRepository from './message.repository';
import { compileTemplate } from '../../common/utils/templateHelper';
import AppError from '../../common/errors/AppError';
import metadataRepository from '../metadata/metadata.repository';
import { PrismaError } from '../../types/common.types';
import { UserMessageGroup } from '../../types/message.types';

interface NoticeCreateData {
  title: string;
  content: string;
  isPinned?: boolean;
}

interface NoticeGetParams {
  page?: number;
  limit?: number;
  search?: string;
}

class MessageService {
  // ==========================================
  // 기존 메시지 관련 메서드
  // ==========================================

  // 임시 배정 메시지 일괄 발송
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

    // 그룹화 로직 (User ID 기준)
    const userMap = new Map<number, UserMessageGroup>();
    targets.forEach((assign) => {
      const userId = assign.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, { user: assign.User, assignments: [] });
      }
      userMap.get(userId)!.assignments.push(assign);
    });

    const messagesToCreate: Array<{
      type: 'Temporary';
      body: string;
      userId: number;
      assignmentIds: number[];
    }> = [];

    // 메시지 본문 생성 (템플릿 치환)
    for (const [userId, data] of userMap) {
      const { user, assignments } = data;
      const representative = assignments[0];
      const unit = representative.UnitSchedule.unit;

      // 날짜 목록 텍스트 생성
      const scheduleText = assignments
        .map((a) => {
          const dateStr = a.UnitSchedule.date.toISOString().split('T')[0];
          return `- ${dateStr} (${unit.name})`;
        })
        .join('\n');

      const body = compileTemplate(template.body, {
        userName: user.name,
        unitName: unit.name,
        region: unit.region,
        scheduleText: scheduleText,
      });

      messagesToCreate.push({
        type: 'Temporary',
        body,
        userId: userId,
        assignmentIds: assignments.map((a) => a.unitScheduleId),
      });
    }

    // 저장 (Repo 위임)
    const count = await messageRepository.createMessagesBulk(messagesToCreate);
    return { count, message: `${count}건의 임시 메시지가 발송되었습니다.` };
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
        colleagues: '없음',
        locations: '',
      };

      if (isLeader) {
        // 동료 강사 목록
        const colleagues = unitSchedule.assignments
          .filter((a) => a.userId !== userId)
          .map((a) => `${a.User.name} (${a.User.userphoneNumber})`)
          .join(', ');
        if (colleagues) variables.colleagues = colleagues;

        // 하위 교육장소 목록
        variables.locations = unit.trainingLocations
          .map((loc) => `[${loc.originalPlace}] 인원: ${loc.plannedCount}명`)
          .join('\n');
      }

      // 템플릿 치환
      const body = compileTemplate(targetTemplate.body, variables);

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

  // ==========================================
  // 공지사항 관련 메서드
  // ==========================================

  // 공지사항 생성
  async createNotice(data: NoticeCreateData, authorId: number) {
    if (!data.title || !data.content) {
      throw new AppError('제목과 내용을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }
    const notice = await messageRepository.createNotice({
      title: data.title,
      content: data.content,
      authorId,
      isPinned: data.isPinned,
    });

    // 작성자 이름 조회
    const author = await messageRepository.findAuthorById(authorId);
    return this.formatNotice(notice, author?.name || null);
  }

  // 공지사항 목록 조회
  async getNotices(params: NoticeGetParams = {}) {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;
    const { notices, total } = await messageRepository.findAllNotices({
      skip,
      take: limit,
      search,
    });

    // 작성자 이름 일괄 조회
    const authorIds = [...new Set(notices.map((n) => n.authorId).filter(Boolean))] as number[];
    const authorsMap = new Map<number, string | null>();
    for (const authorId of authorIds) {
      const author = await messageRepository.findAuthorById(authorId);
      authorsMap.set(authorId, author?.name || null);
    }

    return {
      notices: notices.map((n) =>
        this.formatNotice(n, n.authorId ? authorsMap.get(n.authorId) || null : null),
      ),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // 공지사항 단건 조회
  async getNotice(id: number) {
    const notice = await this.getNoticeHelper(id);
    // 조회수 증가 비동기 처리
    messageRepository.increaseViewCount(id).catch(() => {});

    const author = notice.authorId ? await messageRepository.findAuthorById(notice.authorId) : null;
    return this.formatNotice(notice, author?.name || null);
  }

  // 공지사항 수정
  async updateNotice(id: number, data: { title?: string; content?: string; isPinned?: boolean }) {
    await this.getNoticeHelper(id);
    const updated = await messageRepository.updateNotice(id, data);
    const author = updated.authorId
      ? await messageRepository.findAuthorById(updated.authorId)
      : null;
    return this.formatNotice(updated, author?.name || null);
  }

  // 공지사항 삭제
  async deleteNotice(id: number) {
    await this.getNoticeHelper(id);
    return await messageRepository.deleteNotice(id);
  }

  // 공지사항 고정 토글
  async toggleNoticePin(id: number) {
    await this.getNoticeHelper(id);
    const toggled = await messageRepository.toggleNoticePin(id);
    if (!toggled) throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    const author = toggled.authorId
      ? await messageRepository.findAuthorById(toggled.authorId)
      : null;
    return this.formatNotice(toggled, author?.name || null);
  }

  // Helper: 공지사항 존재 확인
  private async getNoticeHelper(id: number) {
    const notice = await messageRepository.findNoticeById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }
    return notice;
  }

  // Helper: 공지사항 응답 포맷
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatNotice(notice: any, authorName: string | null) {
    return {
      id: notice.id,
      title: notice.title,
      content: notice.body,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
      viewCount: notice.viewCount,
      isPinned: notice.isPinned,
      author: { name: authorName },
    };
  }
}

export default new MessageService();

// CommonJS 호환
module.exports = new MessageService();
