// src/libs/prisma.js
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const config = require('../config');

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = config.databaseUrl;
}

const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_URL },
    },
});

module.exports = prisma;
