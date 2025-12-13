// src/domains/message/message.controller.js
const messageService = require('./message.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const logger = require('../../config/logger');

// [Admin] 임시 메시지 일괄 발송
exports.sendTemporary = asyncHandler(async (req, res) => {
    logger.info('[Message] Sending temporary messages...');
    const result = await messageService.sendTemporaryMessages();
    res.json(result);
});

// [Admin] 확정 메시지 일괄 발송
exports.sendConfirmed = asyncHandler(async (req, res) => {
    logger.info('[Message] Sending confirmed messages...');
    const result = await messageService.sendConfirmedMessages();
    res.json(result);
});

// [Instructor] 내 메시지함 조회
exports.getMyMessages = asyncHandler(async (req, res) => {
    const messages = await messageService.getMyMessages(req.user.id);
    res.json(messages);
});

// [Instructor] 메시지 읽음 처리 (선택 구현)
exports.readMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    await messageService.readMessage(req.user.id, messageId);
    res.json({ message: '읽음 처리되었습니다.' });
});