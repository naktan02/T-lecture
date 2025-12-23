"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// server/src/libs/prisma.ts
const client_1 = require("@prisma/client");
// 전역 선언을 통해 개발 환경에서 재시작 시 커넥션 누수를 방지합니다.
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: ['error', 'warn'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = exports.prisma;
module.exports.prisma = exports.prisma;
