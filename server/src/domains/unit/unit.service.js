//server/src/domains/unit/unit.service.js
const unitRepository = require('./unit.repository');
const { buildPaging, buildUnitWhere } = require('./unit.filters');
const { toCreateUnitDto, excelRowToRawUnit } = require('./unit.mapper');
const AppError = require('../../common/errors/AppError');

class UnitService {
  /**
   * [등록] 단건 등록
   * - Mapper(DTO)를 사용하여 데이터 정제 위임
   */
  async registerSingleUnit(rawData) {
    const cleanData = toCreateUnitDto(rawData);
    return await unitRepository.insertOneUnit(cleanData);
  }

  /**
   * [등록] 엑셀 파일 처리 및 일괄 등록
   * - 1. Excel Raw -> API Raw (excelRowToRawUnit)
   * - 2. API Raw -> DB DTO (toCreateUnitDto)
   */
  async processExcelDataAndRegisterUnits(rawRows) {
    // 엑셀 데이터를 내부 포맷으로 변환
    const rawDataList = rawRows.map(excelRowToRawUnit);
    
    // 일괄 등록 로직 재사용
    return await this.registerMultipleUnits(rawDataList);
  }

  /**
   * [등록] 일괄 등록 (내부 로직)
   */
  async registerMultipleUnits(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      // 일반 Error 대신 AppError 사용 (400 Bad Request)
      throw new AppError('등록할 데이터가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    const dtoList = dataArray.map(toCreateUnitDto);
    const results = await unitRepository.insertManyUnits(dtoList);
    return { count: results.length };
  }

  /**
   * [조회] 목록 조회
   * - Filters를 사용하여 쿼리 로직 위임
   */
  async searchUnitList(query) {
    const paging = buildPaging(query);
    const where = buildUnitWhere(query);

    const { total, units } = await unitRepository.findUnitsByFilterAndCount({
      skip: paging.skip,
      take: paging.take,
      where,
    });

    return {
      data: units,
      meta: {
        total,
        page: paging.page,
        limit: paging.limit,
        lastPage: Math.ceil(total / paging.limit),
      },
    };
  }

  /**
   * [변경] 부대 상세 정보 조회
   */
  async getUnitDetailWithSchedules(id) {
    const unit = await unitRepository.findUnitWithRelations(id);
    
    // DB 조회 후 없으면 404 에러 발생
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }
    return unit;
  }

  /**
   * [신규] 부대 기본 정보(이름, 위치 등) 수정
   */
  async modifyUnitBasicInfo(id, rawData) {
    const updateData = {};
    
    if (rawData.name !== undefined) updateData.name = rawData.name;
    if (rawData.unitType !== undefined) updateData.unitType = rawData.unitType;
    if (rawData.wideArea !== undefined) updateData.wideArea = rawData.wideArea;
    if (rawData.region !== undefined) updateData.region = rawData.region;
    
    if (rawData.addressDetail) {
      updateData.addressDetail = rawData.addressDetail;
      updateData.lat = null;
      updateData.lng = null;
    }

    return await unitRepository.updateUnitById(id, updateData);
  }

  /**
   * [신규] 부대 담당자(Contact Point) 정보 수정
   */
  async modifyUnitContactInfo(id, rawData) {
    const updateData = {
      officerName: rawData.officerName,
      officerPhone: rawData.officerPhone,
      officerEmail: rawData.officerEmail,
    };
    return await unitRepository.updateUnitById(id, updateData);
  }

  /**
   * [신규] 특정 부대에 교육 일정 추가
   */
  async addScheduleToUnit(unitId, dateStr) {
    return await unitRepository.insertUnitSchedule(unitId, dateStr);
  }

  /**
   * [신규] 특정 교육 일정 삭제
   */
  async removeScheduleFromUnit(scheduleId) {
    return await unitRepository.deleteUnitSchedule(scheduleId);
  }

  /**
   * [변경] 부대 영구 삭제
   */
  async removeUnitPermanently(id) {
    return await unitRepository.deleteUnitById(id);
  }
}

module.exports = new UnitService();
