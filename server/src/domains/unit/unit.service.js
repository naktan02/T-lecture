//server/src/domains/unit/unit.service.js
const unitRepository = require('./unit.repository');

class UnitService {
  async createUnit(data) {
    // validation 필요 시 추가
    return await unitRepository.create(data);
  }

  async getAllUnits() {
    return await unitRepository.findAll();
  }

  async getUnitById(id) {
    const unit = await unitRepository.findById(id);
    if (!unit) throw new Error('Unit not found');
    return unit;
  }

  async updateUnit(id, data) {
    await this.getUnitById(id); // 존재 확인
    return await unitRepository.update(id, data);
  }

  async deleteUnit(id) {
    await this.getUnitById(id); // 존재 확인
    return await unitRepository.delete(id);
  }
}

module.exports = new UnitService();
