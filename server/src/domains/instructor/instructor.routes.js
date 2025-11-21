const express = require('express');
const router = express.Router();

const instructorController = require('../../domains/instructor/controllers/instructor.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 강사 + 관리자만 접근 가능
router.use(auth, requireRole('INSTRUCTOR', 'ADMIN'));

router.get('/me', instructorController.getMe);

router.patch('/me', instructorController.updateMe);

router.get('/availability', instructorController.getAvailability);

router.put('/availability', instructorController.updateAvailability);

module.exports = router;
