// src/domains/metadata/metadata.service.js
const metadataRepository = require('./metadata.repository');

class MetadataService {

    async getInstructorMeta() {
        const [virtues, teams, categories] = await Promise.all([
        metadataRepository.findVirtues(),
        metadataRepository.findTeams(),
        metadataRepository.findCategories(),
        ]);

        return { virtues, teams, categories };
    }
}

module.exports = new MetadataService();
