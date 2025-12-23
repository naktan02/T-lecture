"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/metadata/metadata.service.ts
const metadata_repository_1 = __importDefault(require("./metadata.repository"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
// 공통 유틸: 숫자 ID 파싱/검증
const parseIntIdOrThrow = (raw, fieldName = 'id') => {
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || !Number.isInteger(n) || n <= 0) {
        throw new AppError_1.default(`유효하지 않은 ${fieldName} 입니다.`, 400, 'VALIDATION_ERROR', {
            [fieldName]: raw,
        });
    }
    return n;
};
// 공통 유틸: 문자열 검증
const requireNonEmptyString = (value, fieldName) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new AppError_1.default(`${fieldName} 값이 필요합니다.`, 400, 'VALIDATION_ERROR', {
            [fieldName]: value,
        });
    }
    return value.trim();
};
class MetadataService {
    // 강사 가입용 메타데이터 (통합)
    async getInstructorMeta() {
        const [virtues, teams, categories] = await Promise.all([
            metadata_repository_1.default.findVirtues(),
            metadata_repository_1.default.findTeams(),
            metadata_repository_1.default.findCategories(),
        ]);
        return { virtues, teams, categories };
    }
    // 팀 목록 조회
    async getAllTeams() {
        return metadata_repository_1.default.findTeams();
    }
    // 덕목 목록 조회
    async getAllVirtues() {
        return metadata_repository_1.default.findVirtues();
    }
    // 템플릿 목록 조회
    async getMessageTemplates() {
        return metadata_repository_1.default.findMessageTemplates();
    }
    // 팀 수정
    async updateTeam(id, name) {
        const teamId = parseIntIdOrThrow(id, 'teamId');
        const teamName = requireNonEmptyString(name, 'name');
        return metadata_repository_1.default.updateTeam(teamId, teamName);
    }
    // 덕목 수정
    async updateVirtue(id, name) {
        const virtueId = parseIntIdOrThrow(id, 'virtueId');
        const virtueName = requireNonEmptyString(name, 'name');
        return metadata_repository_1.default.updateVirtue(virtueId, virtueName);
    }
    // 템플릿 수정
    async updateMessageTemplate(key, title, body) {
        const templateKey = requireNonEmptyString(key, 'key');
        const t = requireNonEmptyString(title, 'title');
        const b = requireNonEmptyString(body, 'body');
        return metadata_repository_1.default.updateMessageTemplate(templateKey, t, b);
    }
}
exports.default = new MetadataService();
// CommonJS 호환
module.exports = new MetadataService();
