// server/src/domains/unit/unit.service.js
const unitRepository = require('./unit.repository');
const { buildPaging, buildUnitWhere } = require('./unit.filters');
const AppError = require('../../common/errors/AppError');

class UnitService {
  /**
   * 1. 부대 목록 조회 (검색, 필터, 페이징)
   * - Controller에서 req.query를 params로 넘겨줍니다.
   */
  async searchUnitList(params) {
    // 1) 페이징 계산 (page, limit)
    const { skip, take, page, limit } = buildPaging(params);
    
    // 2) 검색 조건 생성 (filters.js 활용)
    const where = buildUnitWhere(params);

    // 3) 데이터 조회 및 개수 확인
    const [data, total] = await Promise.all([
      unitRepository.findMany(where, skip, take),
      unitRepository.count(where)
    ]);

    // 4) 메타데이터 구성 (페이지 정보)
    const lastPage = Math.ceil(total / limit) || 1;
    const meta = {
      total,
      page,
      lastPage,
      limit,
    };

    return { data, meta };
  }

  /**
   * 2. 부대 상세 조회
   */
  async getUnitDetail(id) {
    const unit = await unitRepository.findUnitById(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404);
    }
    return unit;
  }

  /**
   * 3. 단일 부대 등록 (신규 생성)
   * - 프론트엔드 '신규 등록' 시 호출됩니다.
   */
  async registerSingleUnit(rawData) {
    // 기본 정보 필드만 추출
    const unitData = this._extractBasicInfo(rawData);
    
    // Repository에 등록 요청 (하위 데이터 포함)
    return await unitRepository.createUnitWithNested(
      unitData,
      rawData.trainingLocations || [],
      rawData.schedules || [],
      rawData.excludedDates || []
    );
  }

  /**
   * 4. 단일 부대 수정 (정보 갱신)
   * - 프론트엔드 '상세 정보 -> 저장' 시 호출됩니다.
   */
  async modifyUnitBasicInfo(id, rawData) {
    // 기본 정보 필드만 추출
    const unitData = this._extractBasicInfo(rawData);

    // Repository에 수정 요청
    return await unitRepository.updateUnitWithNested(
      id,
      unitData,
      rawData.trainingLocations,
      rawData.schedules,
      rawData.excludedDates
    );
  }

  /**
   * 5. 엑셀 일괄 등록
   */
  async registerMultipleUnits(unitsList) {
    if (!unitsList || unitsList.length === 0) {
      throw new AppError('등록할 데이터가 없습니다.');
    }
    return await unitRepository.insertManyUnits(unitsList);
  }

  /**
   * 6. 부대 삭제 (단건)
   */
  async removeUnitPermanently(id) {
    return await unitRepository.deleteUnitById(id);
  }

  /**
   * 7. 부대 삭제 (다중)
   */
  async removeMultipleUnits(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('삭제할 ID 목록이 없습니다.');
    }
    return await unitRepository.deleteManyUnits(ids);
  }

  /**
   * [Helper] 요청 데이터에서 Unit 테이블용 기본 필드만 추출하고 날짜 형식을 변환합니다.
   */
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

    // 날짜/시간 필드 변환 (값이 있을 때만 Date 객체로)
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