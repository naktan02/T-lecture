const express = require('express');
const config = require('./config');
const { logger } = require('./common/middlewares');
const userRoutes = require('./modules/user');
const locationRoutes = require('./modules/location');

const app = express();

app.use(express.json()); // For parsing application/json
app.use(logger); // Use the logger middleware

// API Routes
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('Hello T-LECTURE!');
});

// Server Start
app.listen(config.port, () => {
  console.log(`Server listening at http://localhost:${config.port}`);
});