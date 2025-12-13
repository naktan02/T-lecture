// src/api/v1/index.js
const express = require('express');
const router = express.Router();

// ✅ 경로 수정: 도메인별 폴더에서 가져오도록 변경
const unitRoutes = require('../../domains/unit/unit.routes');         
const distanceRoutes = require('../../domains/distance/distance.routes'); 
const authRoutes = require('../../domains/auth/auth.routes');        
const instructorRoutes = require('../../domains/instructor/instructor.routes'); 
const adminRoutes = require('../../domains/user/routes/user.admin.routes'); 
const userRoutes = require('../../domains/user/routes/user.me.routes');
const assignmentRoutes = require('../../domains/assignment/assignment.routes');
const metadataRoutes = require('../../domains/metadata/metadata.routes');
const messageRoutes = require('../../domains/message/message.routes');

// 1. Auth (회원가입, 로그인 등)
router.use('/auth', authRoutes);

// 2. Users (내 정보 관리)
router.use('/users', userRoutes);

// 3. Admin (관리자 기능 - 회원 관리)
router.use('/admin', adminRoutes);

// 4. Units (부대 관리)
router.use('/units', unitRoutes);

// 5. Distance (거리 계산/조회)
router.use('/distance', distanceRoutes);

// 6. Instructor (강사 전용 기능)
router.use('/instructor', instructorRoutes); 

// 7. Assignment (강사-부대 배정 관리)
router.use('/assignments', assignmentRoutes);

// 8. Metadata (기타 메타데이터 조회)
router.use('/metadata', metadataRoutes);

// 9. Message (메시지 알림 관리)
router.use('/messages', messageRoutes);


module.exports = router;

