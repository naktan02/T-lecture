"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMessage = exports.getMyMessages = exports.sendConfirmed = exports.sendTemporaryMessages = exports.getNotices = exports.createNotice = void 0;
const message_service_1 = __importDefault(require("./message.service"));
const asyncHandler_1 = __importDefault(require("../../common/middlewares/asyncHandler"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const logger_1 = __importDefault(require("../../config/logger"));
// 공지사항 작성
exports.createNotice = (0, asyncHandler_1.default)(async (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) {
        throw new AppError_1.default('제목과 본문을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }
    logger_1.default.info('[Message] Creating notice...', { title });
    const result = await message_service_1.default.createNotice(title, body);
    res.status(201).json(result);
});
// 공지사항 목록 조회
exports.getNotices = (0, asyncHandler_1.default)(async (req, res) => {
    const notices = await message_service_1.default.getNotices();
    res.json(notices);
});
// 임시 배정 메시지 일괄 발송
exports.sendTemporaryMessages = (0, asyncHandler_1.default)(async (req, res) => {
    logger_1.default.info('[Message] Sending temporary messages...');
    const result = await message_service_1.default.sendTemporaryMessages();
    res.json(result);
});
// 확정 배정 메시지 일괄 발송
exports.sendConfirmed = (0, asyncHandler_1.default)(async (req, res) => {
    logger_1.default.info('[Message] Sending confirmed messages...');
    const result = await message_service_1.default.sendConfirmedMessages();
    res.json(result);
});
// 내 메시지함 조회
exports.getMyMessages = (0, asyncHandler_1.default)(async (req, res) => {
    const messages = await message_service_1.default.getMyMessages(req.user.id);
    res.json(messages);
});
// 메시지 읽음 처리
exports.readMessage = (0, asyncHandler_1.default)(async (req, res) => {
    const { messageId } = req.params;
    if (!messageId) {
        throw new AppError_1.default('messageId가 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    await message_service_1.default.readMessage(req.user.id, messageId);
    res.json({ message: '읽음 처리되었습니다.' });
});
// CommonJS 호환
module.exports = {
    createNotice: exports.createNotice,
    getNotices: exports.getNotices,
    sendTemporaryMessages: exports.sendTemporaryMessages,
    sendConfirmed: exports.sendConfirmed,
    getMyMessages: exports.getMyMessages,
    readMessage: exports.readMessage,
};
