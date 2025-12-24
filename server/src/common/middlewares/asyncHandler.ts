// server/src/common/middlewares/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = asyncHandler;
module.exports.asyncHandler = asyncHandler;
