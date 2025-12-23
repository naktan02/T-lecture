// server/src/domains/unit/unit.service.js
const unitRepository = require('./unit.repository');
const { buildPaging, buildUnitWhere } = require('./unit.filters');
const AppError = require('../../common/errors/AppError');

class UnitService {
  // 1. 목록 조회
  async searchUnitList(params) {
    const { skip, take, page, limit } = buildPaging(params);
    const where = buildUnitWhere(params);

    const [data, total] = await Promise.all([
      unitRepository.findMany(where, skip, take),
      unitRepository.count(where)
    ]);

    const lastPage = Math.ceil(total / limit) || 1;
    return { data, meta: { total, page, lastPage, limit } };
  }

  // 2. 상세 조회
  async getUnitDetail(id) {
    const unit = await unitRepository.findUnitById(id);
    if (!unit) throw new AppError('부대를 찾을 수 없습니다.', 404);
    return unit;
  }

  // 3. 신규 등록
  async registerSingleUnit(rawData) {
    const unitData = this._extractBasicInfo(rawData);
    return await unitRepository.createUnitWithNested(
      unitData,
      rawData.trainingLocations || [],
      rawData.schedules || [],
      rawData.excludedDates || []
    );
  }

  // 4. 정보 수정
  async modifyUnitBasicInfo(id, rawData) {
    const unitData = this._extractBasicInfo(rawData);
    return await unitRepository.updateUnitWithNested(
      id,
      unitData,
      rawData.trainingLocations,
      rawData.schedules,
      rawData.excludedDates
    );
  }

  // 5. 엑셀 일괄 등록
  async registerMultipleUnits(unitsList) {
    if (!unitsList || unitsList.length === 0) throw new AppError('데이터가 없습니다.');
    return await unitRepository.insertManyUnits(unitsList);
  }

  // 6. 삭제
  async removeUnitPermanently(id) { return await unitRepository.deleteUnitById(id); }
  async removeMultipleUnits(ids) {
    if (!ids || !ids.length) throw new AppError('ID 목록이 없습니다.');
    return await unitRepository.deleteManyUnits(ids);
  }

  // Helper
  _extractBasicInfo(rawData) {
    const updateData = {};
    const allow = ['name', 'unitType', 'wideArea', 'region', 'addressDetail', 'officerName', 'officerPhone', 'officerEmail', 'lat', 'lng'];
    allow.forEach(f => { if (rawData[f] !== undefined) updateData[f] = rawData[f]; });

    const toDate = (v) => (v ? new Date(v) : null);
    if (rawData.educationStart) updateData.educationStart = toDate(rawData.educationStart);
    if (rawData.educationEnd) updateData.educationEnd = toDate(rawData.educationEnd);
    
    ['workStartTime', 'workEndTime', 'lunchStartTime', 'lunchEndTime'].forEach(f => {
      if (rawData[f]) updateData[f] = toDate(rawData[f]);
    });
    return updateData;
  }
}

module.exports = new UnitService();