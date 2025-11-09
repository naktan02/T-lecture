const express = require('express');
const config = require('./config');
const { logger } = require('./common/middlewares');
const userController = require('./modules/user/controllers/user.controller');

const app = express();

app.use(express.json()); // For parsing application/json
app.use(logger); // Use the logger middleware

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// User routes
app.get('/users', userController.getUsers);
app.post('/users', userController.createUser);

app.listen(config.port, () => {
  console.log(`Server listening at http://localhost:${config.port}`);
});
