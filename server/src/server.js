const express = require('express');
const config = require('./config');
const { logger } = require('./common/middlewares');
const userRoutes = require('./modules/user'); // (user 모듈도 index.js로 라우터 분리 추천)
const locationRoutes = require('./modules/location');

const app = express();

app.use(express.json()); // For parsing application/json
app.use(logger); // Use the logger middleware
app.use('/api/locations', locationRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// User routes
app.get('/users', userController.getUsers);
app.post('/users', userController.createUser);

app.listen(config.port, () => {
  console.log(`Server listening at http://localhost:${config.port}`);
});

app.listen(config.port, () => {
  console.log(`Server listening at http://localhost:${config.port}`);
});