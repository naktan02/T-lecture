// server/src/modules/location/services/location.service.js
const locationRepository = require('../repositories/location.repository');

exports.createLocation = async (data) => {
  // 필요한 경우 여기서 유효성 검사(Validation) 수행
  return await locationRepository.create(data);
};

exports.getAllLocations = async () => {
  return await locationRepository.findAll();
};

exports.getLocationById = async (id) => {
  const location = await locationRepository.findById(id);
  if (!location) {
    throw new Error('Lecture location not found');
  }
  return location;
};

exports.updateLocation = async (id, data) => {
  // 존재 여부 확인
  await this.getLocationById(id);
  return await locationRepository.update(id, data);
};

exports.deleteLocation = async (id) => {
  // 존재 여부 확인
  await this.getLocationById(id);
  return await locationRepository.delete(id);
};