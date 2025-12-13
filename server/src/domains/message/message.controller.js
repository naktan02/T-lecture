// src/domains/message/message.controller.js
const messageService = require('./message.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');
const logger = require('../../config/logger');

/**
 * [Admin] 공지사항 작성
 * - 필수: title, body
 */
exports.createNotice = asyncHandler(async (req, res) => {
    const { title, body } = req.body;

    // 컨트롤러 레벨 유효성 검사 (Fail Fast)
    if (!title || !body) {
        throw new AppError('제목과 본문을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }

    logger.info('[Message] Creating notice...', { title });
    
    const result = await messageService.createNotice(title, body);
    res.status(201).json(result);
});

/**
 * [All] 공지사항 목록 조회
 */
exports.getNotices = asyncHandler(async (req, res) => {
    const notices = await messageService.getNotices();
    res.json(notices);
});

/**
 * [Admin] 임시 배정 메시지 일괄 발송
 */
exports.sendTemporaryMessages = asyncHandler(async (req, res) => {
    logger.info('[Message] Sending temporary messages...');
    const result = await messageService.sendTemporaryMessages();
    res.json(result);
});

/**
 * [Admin] 확정 배정 메시지 일괄 발송
 */
exports.sendConfirmed = asyncHandler(async (req, res) => {
    logger.info('[Message] Sending confirmed messages...');
    const result = await messageService.sendConfirmedMessages();
    res.json(result);
});

/**
 * [Instructor] 내 메시지함 조회
 */
exports.getMyMessages = asyncHandler(async (req, res) => {
    const messages = await messageService.getMyMessages(req.user.id);
    res.json(messages);
});

/**
 * [Instructor] 메시지 읽음 처리
 * - 필수: messageId (Path Parameter)
 */
exports.readMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    if (!messageId) {
        throw new AppError('messageId가 필요합니다.', 400, 'VALIDATION_ERROR');
    }

    await messageService.readMessage(req.user.id, messageId);
    res.json({ message: '읽음 처리되었습니다.' });
});