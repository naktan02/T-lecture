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
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404);
    }
    return unit;
  }

  // 3. 신규 등록 (✅ 일정 자동 계산 적용)
  async registerSingleUnit(rawData) {
    const unitData = this._extractBasicInfo(rawData);
    
    // 클라이언트가 보낸 schedules는 무시하고, 날짜 기준으로 서버에서 자동 생성
    const schedules = this._calculateSchedules(
      unitData.educationStart, 
      unitData.educationEnd, 
      rawData.excludedDates // [{date: '...'}, ...] 형태 또는 문자열 배열
    );

    return await unitRepository.createUnitWithNested(
      unitData,
      rawData.trainingLocations || [],
      schedules, // 계산된 일정 전달
      rawData.excludedDates || []
    );
  }

  // 4. 정보 수정 (✅ 일정 자동 재계산 적용)
  async modifyUnitBasicInfo(id, rawData) {
    const unitData = this._extractBasicInfo(rawData);
    
    // 기간이나 불가일자가 변경되었을 수 있으므로 일정 재계산
    const schedules = this._calculateSchedules(
      unitData.educationStart, 
      unitData.educationEnd, 
      rawData.excludedDates
    );

    return await unitRepository.updateUnitWithNested(
      id,
      unitData,
      rawData.trainingLocations,
      schedules, // 계산된 일정으로 덮어쓰기 (Repository에서 기존 일정 삭제 후 재생성됨)
      rawData.excludedDates
    );
  }

  // 5. 엑셀 일괄 등록
  async registerMultipleUnits(unitsList) {
    if (!unitsList || unitsList.length === 0) {
      throw new AppError('등록할 데이터가 없습니다.');
    }
    // 엑셀은 Mapper에서 이미 schedules를 계산해서 넘겨주므로 그대로 저장
    return await unitRepository.insertManyUnits(unitsList);
  }

  // 6. 삭제
  async removeUnitPermanently(id) {
    return await unitRepository.deleteUnitById(id);
  }

  async removeMultipleUnits(ids) {
    if (!ids || !ids.length) {
      throw new AppError('삭제할 ID 목록이 없습니다.');
    }
    return await unitRepository.deleteManyUnits(ids);
  }

  // --- Helpers ---

  /**
   * ✅ 일정 자동 계산 로직
   * 시작일(start)부터 종료일(end)까지 하루씩 순회하며, 
   * 불가일(excludedDates)에 포함되지 않은 날짜만 배열로 반환합니다.
   */
  _calculateSchedules(start, end, excludedDates) {
    if (!start || !end) return [];
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // 불가일자 목록을 'YYYY-MM-DD' 문자열 Set으로 변환 (비교 편의성)
    const excludedSet = new Set(
      (excludedDates || []).map(d => {
        // d가 객체({date: ...})일 수도 있고 문자열일 수도 있음
        const val = d.date || d;
        const dateObj = new Date(val);
        // 유효한 날짜면 ISO 문자열 앞부분만 추출
        return !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : null;
      }).filter(Boolean)
    );

    const schedules = [];
    let current = new Date(startDate);

    // 시작일부터 종료일까지 루프
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      
      // 불가일자에 포함되지 않으면 일정 추가
      if (!excludedSet.has(dateStr)) {
        schedules.push({ date: new Date(current) });
      }
      
      // 하루 증가
      current.setDate(current.getDate() + 1);
    }
    return schedules;
  }

  // 기본 정보 추출 및 날짜 변환
  _extractBasicInfo(rawData) {
    const updateData = {};
    const allowFields = [
      'name', 'unitType', 'wideArea', 'region', 'addressDetail', 
      'officerName', 'officerPhone', 'officerEmail', 
      'lat', 'lng'
    ];
    
    allowFields.forEach(f => {
      if (rawData[f] !== undefined) updateData[f] = rawData[f];
    });

    const toDate = (val) => (val ? new Date(val) : null);
    
    if (rawData.educationStart !== undefined) updateData.educationStart = toDate(rawData.educationStart);
    if (rawData.educationEnd !== undefined) updateData.educationEnd = toDate(rawData.educationEnd);
    
    const timeFields = ['workStartTime', 'workEndTime', 'lunchStartTime', 'lunchEndTime'];
    timeFields.forEach(f => {
      if (rawData[f] !== undefined) updateData[f] = toDate(rawData[f]);
    });

    return updateData;
  }
}

module.exports = new UnitService();