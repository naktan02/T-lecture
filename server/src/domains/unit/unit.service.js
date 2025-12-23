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

  async getUnitDetail(id) {
    const unit = await unitRepository.findUnitById(id);
    if (!unit) throw new AppError('부대를 찾을 수 없습니다.', 404);
    return unit;
  }

  async registerSingleUnit(rawData) {
    const unitData = this._extractBasicInfo(rawData);
    // ✅ 일정 자동 계산
    const schedules = this._calculateSchedules(unitData.educationStart, unitData.educationEnd, rawData.excludedDates);
    
    return await unitRepository.createUnitWithNested(
      unitData,
      rawData.trainingLocations || [],
      schedules,
      rawData.excludedDates || []
    );
  }

  async modifyUnitBasicInfo(id, rawData) {
    const unitData = this._extractBasicInfo(rawData);
    // ✅ 일정 자동 재계산
    const schedules = this._calculateSchedules(unitData.educationStart, unitData.educationEnd, rawData.excludedDates);

    return await unitRepository.updateUnitWithNested(
      id,
      unitData,
      rawData.trainingLocations,
      schedules,
      rawData.excludedDates
    );
  }

  async registerMultipleUnits(unitsList) {
    if (!unitsList?.length) throw new AppError('데이터 없음');
    return await unitRepository.insertManyUnits(unitsList);
  }

  async removeUnitPermanently(id) { return await unitRepository.deleteUnitById(id); }
  async removeMultipleUnits(ids) { return await unitRepository.deleteManyUnits(ids); }

  // [일정 계산 로직]
  _calculateSchedules(start, end, excludedDates) {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const excludedSet = new Set(
      (excludedDates || []).map(d => {
        const val = d.date || d;
        const dateObj = new Date(val);
        return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
      }).filter(Boolean)
    );

    const schedules = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      if (!excludedSet.has(dateStr)) {
        schedules.push({ date: new Date(current) });
      }
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