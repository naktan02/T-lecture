const express = require('express');

module.exports = {
  // Example middleware
  logger: (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  },
  // Add other common middlewares here
};
