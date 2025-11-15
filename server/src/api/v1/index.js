// src/api/v1/index.js
const express = require('express');
const userRoutes = require('./user.routes');
const locationRoutes = require('./location.routes');

const router = express.Router();

// /api/v1/users
router.use('/users', userRoutes);

// /api/v1/locations
router.use('/locations', locationRoutes);

module.exports = router;
