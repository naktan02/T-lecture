"use strict";
// src/common/utils/templateHelper.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileTemplate = void 0;
/**
 * 템플릿의 {{key}}를 data의 값으로 치환합니다.
 */
const compileTemplate = (templateBody, data) => {
    if (!templateBody)
        return '';
    return templateBody.replace(/{{(.*?)}}/g, (match, key) => {
        const trimmedKey = key.trim();
        return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : match;
    });
};
exports.compileTemplate = compileTemplate;
