// src/common/utils/templateHelper.js

/**
 * 템플릿의 {{key}}를 data의 값으로 치환합니다.
 */
exports.compileTemplate = (templateBody, data) => {
    if (!templateBody) return '';
    return templateBody.replace(/{{(.*?)}}/g, (match, key) => {
        const trimmedKey = key.trim();
        return data[trimmedKey] !== undefined ? data[trimmedKey] : match;
    });
};