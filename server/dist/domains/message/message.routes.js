"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/domains/message/message.routes.ts
const express_1 = __importDefault(require("express"));
const messageController = __importStar(require("./message.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = express_1.default.Router();
// 공지사항 작성
router.post('/notices', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), messageController.createNotice);
// 공지사항 조회
router.get('/notices', middlewares_1.auth, messageController.getNotices);
// 임시 배정 메시지 발송
router.post('/send/temporary', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), messageController.sendTemporaryMessages);
// 확정 배정 메시지 발송
router.post('/send/confirmed', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), messageController.sendConfirmed);
// 내 메시지함 조회
router.get('/', middlewares_1.auth, messageController.getMyMessages);
// 메시지 읽음 처리
router.patch('/:messageId/read', middlewares_1.auth, messageController.readMessage);
exports.default = router;
// CommonJS 호환
module.exports = router;
