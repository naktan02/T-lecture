"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTemplate = exports.updateVirtue = exports.updateTeam = exports.getMessageTemplates = exports.getVirtues = exports.getTeams = exports.getInstructorMeta = void 0;
const metadata_service_1 = __importDefault(require("./metadata.service"));
const asyncHandler_1 = __importDefault(require("../../common/middlewares/asyncHandler"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
// [강사 가입용] 메타데이터 통합 조회
exports.getInstructorMeta = (0, asyncHandler_1.default)(async (req, res) => {
    const data = await metadata_service_1.default.getInstructorMeta();
    res.status(200).json(data);
});
// [관리자/공통] 팀 목록 조회
exports.getTeams = (0, asyncHandler_1.default)(async (req, res) => {
    const teams = await metadata_service_1.default.getAllTeams();
    res.status(200).json(teams);
});
// [관리자/공통] 덕목 목록 조회
exports.getVirtues = (0, asyncHandler_1.default)(async (req, res) => {
    const virtues = await metadata_service_1.default.getAllVirtues();
    res.status(200).json(virtues);
});
// [관리자] 메시지 템플릿 목록 조회
exports.getMessageTemplates = (0, asyncHandler_1.default)(async (req, res) => {
    const templates = await metadata_service_1.default.getMessageTemplates();
    res.status(200).json(templates);
});
// 팀 수정
exports.updateTeam = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (name === undefined) {
        throw new AppError_1.default('팀 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const updated = await metadata_service_1.default.updateTeam(id, name);
    res.status(200).json(updated);
});
// 덕목 수정
exports.updateVirtue = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (name === undefined) {
        throw new AppError_1.default('덕목 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const updated = await metadata_service_1.default.updateVirtue(id, name);
    res.status(200).json(updated);
});
// 메시지 템플릿 수정
exports.updateTemplate = (0, asyncHandler_1.default)(async (req, res) => {
    const { key } = req.params;
    const { title, body } = req.body;
    if (title === undefined || body === undefined) {
        throw new AppError_1.default('템플릿 제목(title)과 본문(body)이 모두 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const updated = await metadata_service_1.default.updateMessageTemplate(key, title, body);
    res.status(200).json(updated);
});
// CommonJS 호환
module.exports = {
    getInstructorMeta: exports.getInstructorMeta,
    getTeams: exports.getTeams,
    getVirtues: exports.getVirtues,
    getMessageTemplates: exports.getMessageTemplates,
    updateTeam: exports.updateTeam,
    updateVirtue: exports.updateVirtue,
    updateTemplate: exports.updateTemplate,
};
