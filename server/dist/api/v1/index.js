"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/api/v1/index.ts
const express_1 = require("express");
// 각 도메인별 라우터들
const auth_routes_1 = __importDefault(require("../../domains/auth/auth.routes"));
const user_me_routes_1 = __importDefault(require("../../domains/user/routes/user.me.routes"));
const user_admin_routes_1 = __importDefault(require("../../domains/user/routes/user.admin.routes"));
const assignment_routes_1 = __importDefault(require("../../domains/assignment/assignment.routes"));
const instructor_routes_1 = __importDefault(require("../../domains/instructor/instructor.routes"));
const message_routes_1 = __importDefault(require("../../domains/message/message.routes"));
const distance_routes_1 = __importDefault(require("../../domains/distance/distance.routes"));
const unit_routes_1 = __importDefault(require("../../domains/unit/unit.routes"));
const metadata_routes_1 = __importDefault(require("../../domains/metadata/metadata.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/users', user_me_routes_1.default);
router.use('/admin', user_admin_routes_1.default);
router.use('/assignments', assignment_routes_1.default);
router.use('/instructor', instructor_routes_1.default);
router.use('/messages', message_routes_1.default);
router.use('/distance', distance_routes_1.default);
router.use('/units', unit_routes_1.default);
router.use('/metadata', metadata_routes_1.default);
exports.default = router;
