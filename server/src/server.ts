// src/server.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config';
import { requestLogger } from './common/middlewares';
import v1Router from './api/v1';
import errorHandler from './common/middlewares/errorHandler';
import logger from './config/logger';
import './jobs/distanceBatch.job';
import './jobs/statsBatch.job';

const app = express();

const isProd = process.env.NODE_ENV === 'production';

const parseOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// ✅ NODE_ENV에 따라 env 변수 하나만 선택
const allowedOrigins = isProd
  ? parseOrigins(process.env.CORS_ORIGINS_PROD)
  : parseOrigins(process.env.CORS_ORIGINS_DEV);

// ✅ 운영인데 PROD 오리진이 비어있으면 즉시 실패(안전)
if (isProd && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS_PROD must be set in production');
}

// ✅ 개발인데 DEV 오리진도 비어있으면 기본값 제공(선택)
if (!isProd && allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173');
}

app.use(
  cors({
    origin(origin, callback) {
      // 서버-서버 요청(origin 없이 올 수 있음)은 허용
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // 허용되지 않은 origin
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// preflight(OPTIONS) 허용
app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());

// 모든 v1 API는 /api/v1 아래로
app.use('/api/v1', v1Router);

// 기본 라우트
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello T-LECTURE!');
});
app.use(errorHandler);

// 서버 시작
const server = app.listen(config.port, () => {
  logger.info(`Server listening at http://localhost:${config.port}`);
});

module.exports = { app, server };
