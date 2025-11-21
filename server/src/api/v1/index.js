// src/api/v1/index.js
const express = require('express');
const userRoutes = require('../../domains/user/routes/user.me.routes');
const unitRoutes = require('./unit.routes');
const distanceRoutes = require('./distance.routes');
const authRoutes = require('./auth.routes');
const instructorRoutes = require('./instructor.routes'); // [추가]
const adminRoutes = require('./admin.routes'); // [추가]

const router = express.Router();

// Auth 라우터 연결
router.use('/auth', authRoutes);

// // /api/v1/users
router.use('/users', require('../../domains/user/routes/user.me.routes'));
// 관리자용 유저 라우터 연결
router.use('/admin/users', require('../../domains/user/routes/user.admin.routes'));

// /api/v1/locations
router.use('/units', unitRoutes);

// /api/v1/distances
router.use('/distances', distanceRoutes);

// [추가] /api/v1/instructor 연결
router.use('/instructor', instructorRoutes); 

router.use('/admin', adminRoutes);

module.exports = router;
