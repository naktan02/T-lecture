// src/api/v1/index.js
const express = require('express');
const router = express.Router();

// ✅ 경로 수정: 도메인별 폴더에서 가져오도록 변경
const userRoutes = require('../../domains/user/routes/user.me.routes');
const unitRoutes = require('../../domains/unit/routes/unit.routes');           // ./unit.routes -> ../../domains/unit/unit.routes
const distanceRoutes = require('../../domains/distance/routes/distance.routes'); // ./distance.routes -> ...
const authRoutes = require('../../domains/auth/routes/auth.routes');           // ./auth.routes -> ...
const instructorRoutes = require('../../domains/instructor/routes/instructor.routes'); // ./instructor.routes -> ...
const adminRoutes = require('../../domains/user/routes/user.admin.routes'); // ./admin.routes -> ...

// 1. Auth (회원가입, 로그인 등)
router.use('/auth', authRoutes);

// 2. Users (내 정보 관리)
// /api/v1/users
router.use('/users', userRoutes);

// 3. Admin (관리자 기능 - 회원 관리)
// /api/v1/admin/users
router.use('/admin', adminRoutes);

// 4. Units (부대 관리)
// /api/v1/units
router.use('/units', unitRoutes);

// 5. Distances (거리 계산/조회)
// /api/v1/distances
router.use('/distances', distanceRoutes);

// 6. Instructor (강사 전용 기능)
// /api/v1/instructor
router.use('/instructor', instructorRoutes); 

module.exports = router;