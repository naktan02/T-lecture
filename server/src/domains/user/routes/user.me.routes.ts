//server/src/domains/user/routes/user.me.routes.ts
import express from 'express';
import * as userMeController from '../controllers/user.me.controller';
import { auth } from '../../../common/middlewares';

const router = express.Router();

// [내 정보 조회] - 로그인 필요
router.get('/me', auth, userMeController.getMyProfile);

// [내 정보 수정] - 로그인 필요
router.patch('/me', auth, userMeController.updateMyProfile);

// [내 주소 전용 수정] - 로그인 필요 (좌표 재계산)
router.patch('/me/address', auth, userMeController.updateMyAddress);

// [회원 탈퇴] - 로그인 필요
router.delete('/me', auth, userMeController.withdraw);

export default router;

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = router;
