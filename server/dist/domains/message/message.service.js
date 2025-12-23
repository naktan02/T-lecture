"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/domains/message/message.service.ts
const message_repository_1 = __importDefault(require("./message.repository"));
const templateHelper_1 = require("../../common/utils/templateHelper");
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const metadata_repository_1 = __importDefault(require("../metadata/metadata.repository"));
class MessageService {
    // 임시 배정 메시지 일괄 발송
    async sendTemporaryMessages() {
        // 템플릿 조회
        const template = await metadata_repository_1.default.findTemplateByKey('TEMPORARY');
        if (!template) {
            throw new AppError_1.default('임시 배정 메시지 템플릿(TEMPORARY)이 설정되지 않았습니다.', 404, 'TEMPLATE_NOT_FOUND');
        }
        // 대상 조회
        const targets = await message_repository_1.default.findTargetsForTemporaryMessage();
        if (targets.length === 0) {
            throw new AppError_1.default('발송할 대상(임시 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
        }
        // 그룹화 로직 (User ID 기준)
        const userMap = new Map();
        targets.forEach((assign) => {
            const userId = assign.userId;
            if (!userMap.has(userId)) {
                userMap.set(userId, { user: assign.User, assignments: [] });
            }
            userMap.get(userId).assignments.push(assign);
        });
        const messagesToCreate = [];
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
            const body = (0, templateHelper_1.compileTemplate)(template.body, {
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
        const count = await message_repository_1.default.createMessagesBulk(messagesToCreate);
        return { count, message: `${count}건의 임시 메시지가 발송되었습니다.` };
    }
    // 확정 배정 메시지 일괄 발송
    async sendConfirmedMessages() {
        // 템플릿 조회
        const leaderTemplate = await metadata_repository_1.default.findTemplateByKey('CONFIRMED_LEADER');
        const memberTemplate = await metadata_repository_1.default.findTemplateByKey('CONFIRMED_MEMBER');
        if (!leaderTemplate || !memberTemplate) {
            throw new AppError_1.default('확정 배정 템플릿(Leader/Member)이 설정되지 않았습니다.', 404, 'TEMPLATE_NOT_FOUND');
        }
        // 대상 조회
        const targets = await message_repository_1.default.findTargetsForConfirmedMessage();
        if (targets.length === 0) {
            throw new AppError_1.default('발송할 대상(확정 배정 미수신자)이 없습니다.', 404, 'NO_TARGETS');
        }
        // 그룹화
        const userMap = new Map();
        targets.forEach((assign) => {
            const userId = assign.userId;
            if (!userMap.has(userId)) {
                userMap.set(userId, { user: assign.User, assignments: [] });
            }
            userMap.get(userId).assignments.push(assign);
        });
        const messagesToCreate = [];
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
            const variables = {
                userName: user.name,
                unitName: unit.name,
                address: unit.addressDetail,
                colleagues: '없음',
                locations: '',
            };
            if (isLeader) {
                // 동료 강사 목록
                const colleagues = unitSchedule.assignments
                    .filter((a) => a.userId !== userId)
                    .map((a) => `${a.User.name} (${a.User.userphoneNumber})`)
                    .join(', ');
                if (colleagues)
                    variables.colleagues = colleagues;
                // 하위 교육장소 목록
                variables.locations = unit.trainingLocations
                    .map((loc) => `[${loc.originalPlace}] 인원: ${loc.plannedCount}명`)
                    .join('\n');
            }
            // 템플릿 치환
            const body = (0, templateHelper_1.compileTemplate)(targetTemplate.body, variables);
            messagesToCreate.push({
                type: 'Confirmed',
                body,
                userId: userId,
                assignmentIds: assignments.map((a) => a.unitScheduleId),
            });
        }
        // 저장
        const count = await message_repository_1.default.createMessagesBulk(messagesToCreate);
        return { count, message: `${count}건의 확정 메시지가 발송되었습니다.` };
    }
    // 내 메시지함 조회
    async getMyMessages(userId) {
        const receipts = await message_repository_1.default.findMyMessages(userId);
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
    async readMessage(userId, messageId) {
        try {
            // Prisma update는 조건에 맞는 레코드가 없으면 에러(P2025)를 던짐
            await message_repository_1.default.markAsRead(userId, Number(messageId));
            return { success: true };
        }
        catch (error) {
            // Prisma 에러 코드 P2025: Record to update not found
            if (error.code === 'P2025') {
                throw new AppError_1.default('해당 메시지를 찾을 수 없거나 권한이 없습니다.', 404, 'MESSAGE_NOT_FOUND');
            }
            // 그 외 에러는 상위로 전파
            throw error;
        }
    }
    // 공지사항 작성
    async createNotice(title, body) {
        if (!title || !body) {
            throw new AppError_1.default('제목과 본문을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
        }
        return await message_repository_1.default.createNotice({ title, body });
    }
    // 공지사항 목록 조회
    async getNotices() {
        return await message_repository_1.default.findAllNotices();
    }
}
exports.default = new MessageService();
// CommonJS 호환
module.exports = new MessageService();
