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
}

module.exports = new MetadataRepository();
