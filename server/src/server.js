// src/server.js
require('dotenv').config();
const express = require('express');
const config = require('./config');                 
const { requestLogger } = require('./common/middlewares'); 
const v1Router = require('./api/v1');        
const cors = require('cors'); 

require('./jobs/distanceBatch.job');
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',   // 프론트 도메인
  credentials: true,                 // 쿠키 포함 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(requestLogger);

// 모든 v1 API는 /api/v1 아래로
app.use('/api/v1', v1Router);

// 기본 라우트
app.get('/', (req, res) => {
  res.send('Hello T-LECTURE!');
});

// 서버 시작
app.listen(config.port, () => {
  console.log(`Server listening at http://localhost:${config.port}`);
});

// (테스트용으로 app export 해두면 나중에 좋음)
// module.exports = app;
