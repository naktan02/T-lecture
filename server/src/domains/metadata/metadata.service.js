// src/domains/metadata/metadata.service.js
const metadataRepository = require('./metadata.repository');
const AppError = require('../../common/errors/AppError');

class MetadataService {

    async getInstructorMeta() {
        const [virtues, teams, categories] = await Promise.all([
        metadataRepository.findVirtues(),
        metadataRepository.findTeams(),
        metadataRepository.findCategories(),
        ]);

        return { virtues, teams, categories };
    }

    /**
     * [개별] 팀 목록 전체 조회
     */
    async getAllTeams() {
        return await metadataRepository.findTeams();
    }

    /**
     * [개별] 덕목 목록 전체 조회
     */
    async getAllVirtues() {
        return await metadataRepository.findVirtues();
    }

    /**
     * [개별] 메시지 템플릿 목록 조회
     */
    async getMessageTemplates() {
        return await metadataRepository.findMessageTemplates();
    }

    /**
     * 팀 정보 수정
     */
    async updateTeam(id, name) {
        if (!id || !name) throw new AppError('팀 ID와 이름이 필요합니다.', 400, 'VALIDATION_ERROR');
        try {
            return await metadataRepository.updateTeam(id, name);
        } catch (error) {
            if (error.code === 'P2025') throw new AppError('해당 팀을 찾을 수 없습니다.', 404, 'NOT_FOUND');
            throw error;
        }
    }

    /**
     * 덕목 정보 수정
     */
    async updateVirtue(id, name) {
        if (!id || !name) throw new AppError('덕목 ID와 이름이 필요합니다.', 400, 'VALIDATION_ERROR');
        try {
            return await metadataRepository.updateVirtue(id, name);
        } catch (error) {
            if (error.code === 'P2025') throw new AppError('해당 덕목을 찾을 수 없습니다.', 404, 'NOT_FOUND');
            throw error;
        }
    }

    /**
     * 메시지 템플릿 수정
     */
    async updateMessageTemplate(key, title, body) {
        if (!key || !title || !body) throw new AppError('템플릿 Key, 제목, 본문이 모두 필요합니다.', 400, 'VALIDATION_ERROR');
        try {
            return await metadataRepository.updateMessageTemplate(key, title, body);
        } catch (error) {
            if (error.code === 'P2025') throw new AppError('해당 템플릿을 찾을 수 없습니다.', 404, 'NOT_FOUND');
            throw error;
        }
    }
}

module.exports = new MetadataService();
