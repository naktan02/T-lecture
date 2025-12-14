// server/src/domains/unit/unit.service.js
const unitRepository = require('./unit.repository');
const { buildPaging, buildUnitWhere } = require('./unit.filters');
const { toCreateUnitDto, excelRowToRawUnit } = require('./unit.mapper');
const AppError = require('../../common/errors/AppError');

class UnitService {
  // 부대 단건 등록
  async registerSingleUnit(rawData) {
    try {
        const cleanData = toCreateUnitDto(rawData);
        return await unitRepository.insertOneUnit(cleanData);
    } catch (e) {
        if (e.message.includes('부대명(name)은 필수입니다.')) {
            throw new AppError(e.message, 400, 'VALIDATION_ERROR');
        }
        throw e; 
    }
  }

  // 엑셀 파일 처리 및 일괄 등록
  async processExcelDataAndRegisterUnits(rawRows) {
    const rawDataList = rawRows.map(excelRowToRawUnit);
    return await this.registerMultipleUnits(rawDataList);
  }

  // 일괄 등록 (내부 로직)
  async registerMultipleUnits(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new AppError('등록할 데이터가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    try { 
        const dtoList = dataArray.map(toCreateUnitDto);
        const results = await unitRepository.insertManyUnits(dtoList);
        return { count: results.length };
    } catch (e) {
        if (e.message.includes('부대명(name)은 필수입니다.')) {
            throw new AppError(e.message, 400, 'VALIDATION_ERROR');
        }
        throw e; 
    }
  }

  // 목록 조회
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

  // 부대 상세 정보 조회
  async getUnitDetailWithSchedules(id) {
    const unit = await unitRepository.findUnitWithRelations(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }
    return unit;
  }

  // 부대 기본 정보 수정
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

  // 부대 담당자 정보 수정
  async modifyUnitContactInfo(id, rawData) {
    const updateData = {
      officerName: rawData.officerName,
      officerPhone: rawData.officerPhone,
      officerEmail: rawData.officerEmail,
    };
    return await unitRepository.updateUnitById(id, updateData);
  }

  // 부대 일정 추가
  async addScheduleToUnit(unitId, dateStr) {
    const unit = await unitRepository.findUnitWithRelations(unitId);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'NOT_FOUND');
    }

    // date 필수 체크
    if (!dateStr || typeof dateStr !== 'string') {
      throw new AppError('date는 필수입니다.', 400, 'VALIDATION_ERROR');
    }

    // ISO가 오면 YYYY-MM-DD만 잘라서 date-only로 정규화
    const dateOnly = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;

    // YYYY-MM-DD 기본 검증
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      throw new AppError('유효하지 않은 날짜 형식입니다. (YYYY-MM-DD)', 400, 'VALIDATION_ERROR');
    }

    return await unitRepository.insertUnitSchedule(unitId, dateOnly);
  }

  // 특정 교육 일정 삭제
  async removeScheduleFromUnit(scheduleId) {
    if (!scheduleId || isNaN(Number(scheduleId))) {
      throw new AppError('유효하지 않은 일정 ID입니다.', 400, 'VALIDATION_ERROR');
    }
    
    return await unitRepository.deleteUnitSchedule(scheduleId);
  }

  // 부대 영구 삭제
  async removeUnitPermanently(id) {
    return await unitRepository.deleteUnitById(id);
  }
}

module.exports = new UnitService();