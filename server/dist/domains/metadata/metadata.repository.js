"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/metadata/metadata.repository.ts
const prisma_1 = __importDefault(require("../../libs/prisma"));
class MetadataRepository {
    // 덕목(강의) 조회
    async findVirtues() {
        return prisma_1.default.virtue.findMany({
            orderBy: { name: 'asc' },
        });
    }
    // 팀 조회
    async findTeams() {
        return prisma_1.default.team.findMany({
            orderBy: { name: 'asc' },
        });
    }
    // 유저 카테고리 조회 (ENUM → 하드코딩 반환)
    async findCategories() {
        return [
            { id: 'Main', label: '주강사' },
            { id: 'Co', label: '부강사' },
            { id: 'Assistant', label: '보조강사' },
            { id: 'Practicum', label: '실습강사' },
        ];
    }
    // 메시지 템플릿 전체 조회
    async findMessageTemplates() {
        return prisma_1.default.messageTemplate.findMany({
            orderBy: { key: 'asc' },
        });
    }
    // 메시지 템플릿 단건 조회
    async findTemplateByKey(key) {
        return prisma_1.default.messageTemplate.findUnique({
            where: { key },
        });
    }
    // 팀 수정
    async updateTeam(id, name) {
        return prisma_1.default.team.update({
            where: { id },
            data: { name },
        });
    }
    // 덕목 수정
    async updateVirtue(id, name) {
        return prisma_1.default.virtue.update({
            where: { id },
            data: { name },
        });
    }
    // 메시지 템플릿 수정
    async updateMessageTemplate(key, title, body) {
        return prisma_1.default.messageTemplate.update({
            where: { key },
            data: { title, body },
        });
    }
}
exports.default = new MetadataRepository();
// CommonJS 호환
module.exports = new MetadataRepository();
