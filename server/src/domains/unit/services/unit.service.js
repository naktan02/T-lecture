// server/src/modules/unit/services/unit.service.js
const unitRepository = require('../repositories/unit.repository');

exports.createUnit = async (data) => {
  // 필요하면 여기서 유효성 검사 (예: 날짜 순서 체크 등)
  // if (data.educationStart && data.educationEnd && data.educationStart > data.educationEnd) ...
  return await unitRepository.create(data);
};

exports.getAllUnits = async () => {
  return await unitRepository.findAll();
};

exports.getUnitById = async (id) => {
  const unit = await unitRepository.findById(id);
  if (!unit) {
    throw new Error('Unit not found');
  }
  return unit;
};

exports.updateUnit = async (id, data) => {
  await this.getUnitById(id); // 존재 여부 확인
  return await unitRepository.update(id, data);
};

exports.deleteUnit = async (id) => {
  await this.getUnitById(id); // 존재 여부 확인
  return await unitRepository.delete(id);
};
