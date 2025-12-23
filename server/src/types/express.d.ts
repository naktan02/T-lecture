// server/src/types/express.d.ts
import { AuthUser } from '../common/middlewares/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser; // 이제 어디서든 req.user를 바로 쓸 수 있습니다.
    }
  }
}

export {};
