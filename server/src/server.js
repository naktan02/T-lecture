// src/server.js
const express = require('express');
const config = require('./config');                 
const { logger } = require('./common/middlewares/auth'); 
const v1Router = require('./api/v1');              

const app = express();

app.use(express.json());
app.use(logger);

// ✅ 모든 v1 API는 /api/v1 아래로
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
