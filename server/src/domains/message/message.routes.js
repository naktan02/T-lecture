// src/domains/message/message.routes.js
const express = require('express');
const router = express.Router();
const messageController = require('./message.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 공지사항 작성
router.post('/notices', auth, requireRole('ADMIN'), messageController.createNotice);

// 공지사항 조회
router.get('/notices', auth, messageController.getNotices);

// 임시 배정 메시지 발송
router.post('/send/temporary', auth, requireRole('ADMIN'), messageController.sendTemporaryMessages);

// 확정 배정 메시지 발송
router.post('/send/confirmed', auth, requireRole('ADMIN'), messageController.sendConfirmed);

// 내 메시지함 조회
router.get('/', auth, messageController.getMyMessages);

// 메시지 읽음 처리
router.patch('/:messageId/read', auth, messageController.readMessage);

module.exports = router;