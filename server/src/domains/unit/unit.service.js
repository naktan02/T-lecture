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
    
    // 1. Unit 기본 정보 매핑
    if (rawData.name !== undefined) updateData.name = rawData.name;
    if (rawData.unitType !== undefined) updateData.unitType = rawData.unitType;
    if (rawData.wideArea !== undefined) updateData.wideArea = rawData.wideArea;
    if (rawData.region !== undefined) updateData.region = rawData.region;
    if (rawData.addressDetail !== undefined) updateData.addressDetail = rawData.addressDetail;
    if (rawData.lat !== undefined) updateData.lat = rawData.lat;
    if (rawData.lng !== undefined) updateData.lng = rawData.lng;

    // 2. 담당자 정보
    if (rawData.officerName !== undefined) updateData.officerName = rawData.officerName;
    if (rawData.officerPhone !== undefined) updateData.officerPhone = rawData.officerPhone;
    if (rawData.officerEmail !== undefined) updateData.officerEmail = rawData.officerEmail;

    // 3. 시간/날짜 정보 (ISO String -> Date)
    const toDate = (val) => (val ? new Date(val) : null);
    if (rawData.educationStart !== undefined) updateData.educationStart = toDate(rawData.educationStart);
    if (rawData.educationEnd !== undefined) updateData.educationEnd = toDate(rawData.educationEnd);
    if (rawData.workStartTime !== undefined) updateData.workStartTime = toDate(rawData.workStartTime);
    if (rawData.workEndTime !== undefined) updateData.workEndTime = toDate(rawData.workEndTime);
    if (rawData.lunchStartTime !== undefined) updateData.lunchStartTime = toDate(rawData.lunchStartTime);
    if (rawData.lunchEndTime !== undefined) updateData.lunchEndTime = toDate(rawData.lunchEndTime);

    // 4. [핵심] 교육장소(TrainingLocation) 동기화 (Upsert 방식)
    if (Array.isArray(rawData.trainingLocations)) {
      // 클라이언트에서 보내온 ID 목록
      const incomingIds = rawData.trainingLocations
        .filter(loc => loc.id) // ID가 있는 것만
        .map(loc => Number(loc.id));

      updateData.trainingLocations = {
        // 4-1. 요청에 없는 기존 장소는 삭제
        deleteMany: {
          id: { notIn: incomingIds }
        },
        // 4-2. ID가 있으면 수정(update), 없으면 생성(create)
        upsert: rawData.trainingLocations.map(loc => ({
          where: { id: loc.id ? Number(loc.id) : 0 }, // 0은 없으므로 create로 빠짐(주의: upsert where는 unique 필요)
          // *Prisma upsert는 ID가 있어야 하므로, 로직을 분리하는 게 안전합니다.
          // 여기서는 Prisma의 중첩 쓰기 한계로 인해 create/update를 분리하거나 transaction을 써야 하지만,
          // 간단하게 'deleteMany -> createMany' 혹은 아래처럼 'id 있으면 update, 없으면 create'를 조합합니다.
          // 가장 안전한 방법: deleteMany (except incoming) -> upsert items
          // 하지만 upsert는 where id가 필요하므로 신규 생성(id 없음)은 create로 별도 처리해야 합니다.
        }))
      };
      
      // Prisma 중첩 쓰기 단순화: "기존 것 다 지우고 새로 생성"은 ID가 바뀌므로 위험할 수 있음(참조 문제).
      // 따라서 Repository 레벨에서 처리하거나, 아래처럼 분기합니다.
      // (복잡도를 줄이기 위해 Repository에 위임하는 것이 좋으나, 여기서는 바로 구성합니다)
    }

    // 5. [핵심] 일정(UnitSchedule) 동기화
    if (Array.isArray(rawData.schedules)) {
      // schedules: [{ id:..., date: '...' }, ...]
      const incomingScheduleIds = rawData.schedules
         .filter(s => s.id)
         .map(s => Number(s.id));

      updateData.schedules = {
         deleteMany: { id: { notIn: incomingScheduleIds } },
         // 신규 및 수정 처리는 Repository에서 수행하도록 데이터를 넘기거나,
         // Prisma Nested Write를 정교하게 짭니다.
         // 여기서는 간단히 deleteMany 후 createMany(신규) + update(기존) 조합이 필요합니다.
      };
    }

    // 서비스 로직이 복잡해지므로 Repository의 updateUnitWithNested 기능을 호출합니다.
    return await unitRepository.updateUnitWithNested(id, updateData, rawData.trainingLocations, rawData.schedules);
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

  // ✅ [추가] 부대 일괄 삭제
  async removeMultipleUnits(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('삭제할 부대 ID 목록이 없습니다.', 400, 'VALIDATION_ERROR');
    }
    return await unitRepository.deleteManyUnits(ids);
  }
}

module.exports = new UnitService();