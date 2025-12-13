// src/domains/metadata/metadata.repository.js
const prisma = require('../../libs/prisma');

class MetadataRepository {

    async findVirtues() {
        return prisma.virtue.findMany({
        orderBy: { name: 'asc' },
        });
    }

    async findTeams() {
        return prisma.team.findMany({
        orderBy: { name: 'asc' },
        });
    }

    async findCategories() {
        // UserCategory는 ENUM → DB 조회가 아니라 Prisma enum 값 리스트 가져와야 함
        // Prisma에서는 직접 enum 값을 수동으로 배열로 내려야 한다.
        return [
        { id: 'Main', label: '주강사' },
        { id: 'Co', label: '부강사' },
        { id: 'Assistant', label: '보조강사' },
        { id: 'Practicum', label: '실습강사' },
        ];
    }

    // [신규] 다중 메시지 템플릿 조회
    async findMessageTemplates() {
        return prisma.messageTemplate.findMany({
            orderBy: { key: 'asc' }, // 키 값 기준 정렬
        });
    }
    /**
     * [신규] 단일 메시지 템플릿 조회
     */
    async findTemplateByKey(key) {
        return await prisma.messageTemplate.findUnique({
            where: { key },
        });
    }
    // [신규] 팀 수정
    async updateTeam(id, name) {
        return prisma.team.update({
            where: { id: Number(id) },
            data: { name },
        });
    }

    // [신규] 덕목 수정
    async updateVirtue(id, name) {
        return prisma.virtue.update({
            where: { id: Number(id) },
            data: { name },
        });
    }

    // [신규] 템플릿 수정
    async updateMessageTemplate(key, title, body) {
        return prisma.messageTemplate.update({
            where: { key },
            data: { title, body },
        });
    }
}

module.exports = new MetadataRepository();
