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

  // 3. 신규 등록 (일정 자동 계산 적용)
  async registerSingleUnit(rawData) {
    const unitData = this._extractBasicInfo(rawData);
    const excludedDates = rawData.excludedDates || [];
    
    // ✅ [추가] 일정 자동 계산
    const schedules = this._calculateSchedules(unitData.educationStart, unitData.educationEnd, excludedDates);

    return await unitRepository.createUnitWithNested(
      unitData,
      rawData.trainingLocations || [],
      schedules, // 자동 계산된 일정 전달
      excludedDates
    );
  }

  // 4. 정보 수정 (일정 자동 계산 적용)
  async modifyUnitBasicInfo(id, rawData) {
    const unitData = this._extractBasicInfo(rawData);
    const excludedDates = rawData.excludedDates || [];

    // ✅ [추가] 일정 자동 계산 (수정 시에도 기간/불가일이 바뀌면 일정 재계산)
    const schedules = this._calculateSchedules(unitData.educationStart, unitData.educationEnd, excludedDates);

    return await unitRepository.updateUnitWithNested(
      id,
      unitData,
      rawData.trainingLocations || [],
      schedules, // 자동 계산된 일정 전달
      excludedDates
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

  // --- Helpers ---

  // ✅ [신규] 일정 자동 계산 로직
  _calculateSchedules(start, end, excludedDates) {
    if (!start || !end) return [];
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // 불가일자 문자열 리스트 (YYYY-MM-DD)
    const excludedSet = new Set(
      (excludedDates || []).map(d => {
        const dateObj = d.date ? new Date(d.date) : new Date(d); // 객체({date:..}) or 날짜값 처리
        return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
      }).filter(Boolean)
    );

    const schedules = [];
    let current = new Date(startDate);

    // 시작일부터 종료일까지 하루씩 증가
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      
      // 불가일에 포함되지 않으면 일정 추가
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