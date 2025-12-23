// server/src/domains/unit/unit.service.js
const unitRepository = require('./unit.repository');
const { buildPaging, buildUnitWhere } = require('./unit.filters');
const AppError = require('../../common/errors/AppError');

class UnitService {
  async searchUnitList(params) {
    const { skip, take, page, limit } = buildPaging(params);
    const where = buildUnitWhere(params);
    const [data, total] = await Promise.all([
      unitRepository.findMany(where, skip, take),
      unitRepository.count(where)
    ]);
    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) || 1, limit } };
  }

  // ✅ 상세 조회: Repository 결과를 그대로 반환해야 schedule이 포함됨
  async getUnitDetail(id) {
    const unit = await unitRepository.findUnitById(id);
    if (!unit) throw new AppError('부대를 찾을 수 없습니다.', 404);
    return unit;
  }

  // ... (등록, 수정, 삭제 로직은 이전과 동일하게 유지)
  async registerSingleUnit(rawData) {
    const unitData = this._extractBasicInfo(rawData);
    const schedules = this._calculateSchedules(unitData.educationStart, unitData.educationEnd, rawData.excludedDates);
    return await unitRepository.createUnitWithNested(unitData, rawData.trainingLocations || [], schedules, rawData.excludedDates || []);
  }

  async modifyUnitBasicInfo(id, rawData) {
    const unitData = this._extractBasicInfo(rawData);
    const schedules = this._calculateSchedules(unitData.educationStart, unitData.educationEnd, rawData.excludedDates);
    return await unitRepository.updateUnitWithNested(id, unitData, rawData.trainingLocations, schedules, rawData.excludedDates);
  }

  async registerMultipleUnits(list) {
    if (!list?.length) throw new AppError('데이터 없음');
    return await unitRepository.insertManyUnits(list);
  }
  async removeUnitPermanently(id) { return await unitRepository.deleteUnitById(id); }
  async removeMultipleUnits(ids) { return await unitRepository.deleteManyUnits(ids); }

  _calculateSchedules(start, end, excludedDates) {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const excludedSet = new Set((excludedDates || []).map(d => {
      const v = d.date || d;
      const dateObj = new Date(v);
      return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
    }).filter(Boolean));

    const schedules = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      if (!excludedSet.has(dateStr)) schedules.push({ date: new Date(current) });
      current.setDate(current.getDate() + 1);
    }
    return schedules;
  }

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