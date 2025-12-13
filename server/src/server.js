// src/server.js
require('dotenv').config();
const express = require('express');
const config = require('./config');                 
const { requestLogger } = require('./common/middlewares'); 
const v1Router = require('./api/v1');        
const cors = require('cors'); 
const cookieParser = require('cookie-parser');

require('./jobs/distanceBatch.job');
const app = express();

const isProd = process.env.NODE_ENV === 'production';

// 실서비스에서 사용하게 될 프론트 주소들
// 나중에 도메인 정해지면 여기에 추가만 하면 됨.
const allowedOriginsProd = [
  'https://app.t-lecture.com',   // 예시: 실제 프론트 도메인
];

// 개발 환경용(지금 네가 쓰는 주소)
const allowedOriginsDev = ['http://localhost:5173'];

const allowedOrigins = isProd ? allowedOriginsProd : allowedOriginsDev;

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
  })
);

// preflight(OPTIONS) 허용
app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());

// 모든 v1 API는 /api/v1 아래로
app.use('/api/v1', v1Router);

// 기본 라우트
app.get('/', (req, res) => {
  res.send('Hello T-LECTURE!');
});



const errorHandler = require('./common/middlewares/errorHandler');
app.use(errorHandler);

// 서버 시작
const server = app.listen(config.port, () => {
  console.log(`Server listening at http://localhost:${config.port}`);
});

// ✅ 테스트를 위해 app과 server를 export 해야 합니다.
module.exports = { app, server };
