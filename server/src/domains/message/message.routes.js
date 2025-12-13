// src/domains/message/message.routes.js
const express = require('express');
const router = express.Router();
const messageController = require('./message.controller');
const { auth, requireRole } = require('../../common/middlewares');

// --- 공지사항 (Notices) ---

// 1. [관리자] 공지사항 작성
// POST /api/v1/messages/notices
router.post(
    '/notices',
    auth,
    requireRole('ADMIN'),
    messageController.createNotice
);

// 2. [전체] 공지사항 조회 (로그인한 사용자 누구나)
// GET /api/v1/messages/notices
router.get(
    '/notices',
    auth,
    messageController.getNotices
);


// --- 알림/메시지 (Notifications) ---

// 3. [관리자] 임시 배정 메시지 발송
router.post(
    '/temporary',
    auth,
    requireRole('ADMIN'),
    messageController.sendTemporary
);

// 4. [관리자] 확정 배정 메시지 발송
router.post(
    '/confirmed',
    auth,
    requireRole('ADMIN'),
    messageController.sendConfirmed
);

// 5. [강사] 내 메시지함 조회
router.get(
    '/my',
    auth,
    messageController.getMyMessages
);

// 6. [강사] 메시지 읽음 처리
router.patch(
    '/:messageId/read',
    auth,
    messageController.readMessage
);

module.exports = router;