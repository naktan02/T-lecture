// src/domains/message/message.routes.js
const express = require('express');
const router = express.Router();
const messageController = require('./message.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 1. [관리자] 임시 배정 메시지 발송
// POST /api/v1/messages/temporary
router.post(
    '/temporary',
    auth,
    requireRole('ADMIN'),
    messageController.sendTemporary
);

// 2. [관리자] 확정 배정 메시지 발송
// POST /api/v1/messages/confirmed
router.post(
    '/confirmed',
    auth,
    requireRole('ADMIN'),
    messageController.sendConfirmed
);

// 3. [강사] 내 메시지 조회
// GET /api/v1/messages/my
router.get(
    '/my',
    auth,
    requireRole('INSTRUCTOR'),
    messageController.getMyMessages
);

// 4. [강사] 메시지 읽음 처리
// PATCH /api/v1/messages/:messageId/read
router.patch(
    '/:messageId/read',
    auth,
    requireRole('INSTRUCTOR'),
    messageController.readMessage
);

module.exports = router;