"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/unit/unit.service.ts
const unit_repository_1 = __importDefault(require("./unit.repository"));
const unit_filters_1 = require("./unit.filters");
const unit_mapper_1 = require("./unit.mapper");
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
class UnitService {
    // 부대 단건 등록
    async registerSingleUnit(rawData) {
        try {
            const cleanData = (0, unit_mapper_1.toCreateUnitDto)(rawData);
            return await unit_repository_1.default.insertOneUnit(cleanData);
        }
        catch (e) {
            if (e.message.includes('부대명(name)은 필수입니다.')) {
                throw new AppError_1.default(e.message, 400, 'VALIDATION_ERROR');
            }
            throw e;
        }
    }
    // 엑셀 파일 처리 및 일괄 등록
    async processExcelDataAndRegisterUnits(rawRows) {
        const rawDataList = rawRows.map(unit_mapper_1.excelRowToRawUnit);
        return await this.registerMultipleUnits(rawDataList);
    }
    // 일괄 등록 (내부 로직)
    async registerMultipleUnits(dataArray) {
        if (!Array.isArray(dataArray) || dataArray.length === 0) {
            throw new AppError_1.default('등록할 데이터가 없습니다.', 400, 'VALIDATION_ERROR');
        }
        try {
            const dtoList = dataArray.map(unit_mapper_1.toCreateUnitDto);
            const results = await unit_repository_1.default.insertManyUnits(dtoList);
            return { count: results.length };
        }
        catch (e) {
            if (e.message.includes('부대명(name)은 필수입니다.')) {
                throw new AppError_1.default(e.message, 400, 'VALIDATION_ERROR');
            }
            throw e;
        }
    }
    // 목록 조회
    async searchUnitList(query) {
        const paging = (0, unit_filters_1.buildPaging)(query);
        const where = (0, unit_filters_1.buildUnitWhere)(query);
        const { total, units } = await unit_repository_1.default.findUnitsByFilterAndCount({
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
        const unit = await unit_repository_1.default.findUnitWithRelations(id);
        if (!unit) {
            throw new AppError_1.default('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
        }
        return unit;
    }
    // 부대 기본 정보 수정
    async modifyUnitBasicInfo(id, rawData) {
        const updateData = {};
        if (rawData.name !== undefined)
            updateData.name = rawData.name;
        if (rawData.unitType !== undefined)
            updateData.unitType = rawData.unitType;
        if (rawData.wideArea !== undefined)
            updateData.wideArea = rawData.wideArea;
        if (rawData.region !== undefined)
            updateData.region = rawData.region;
        if (rawData.addressDetail) {
            updateData.addressDetail = rawData.addressDetail;
            updateData.lat = null;
            updateData.lng = null;
        }
        return await unit_repository_1.default.updateUnitById(id, updateData);
    }
    // 부대 담당자 정보 수정
    async modifyUnitContactInfo(id, rawData) {
        const updateData = {
            officerName: rawData.officerName,
            officerPhone: rawData.officerPhone,
            officerEmail: rawData.officerEmail,
        };
        return await unit_repository_1.default.updateUnitById(id, updateData);
    }
    // 부대 일정 추가
    async addScheduleToUnit(unitId, dateStr) {
        const unit = await unit_repository_1.default.findUnitWithRelations(unitId);
        if (!unit) {
            throw new AppError_1.default('해당 부대를 찾을 수 없습니다.', 404, 'NOT_FOUND');
        }
        // date 필수 체크
        if (!dateStr || typeof dateStr !== 'string') {
            throw new AppError_1.default('date는 필수입니다.', 400, 'VALIDATION_ERROR');
        }
        // ISO가 오면 YYYY-MM-DD만 잘라서 date-only로 정규화
        const dateOnly = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
        // YYYY-MM-DD 기본 검증
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            throw new AppError_1.default('유효하지 않은 날짜 형식입니다. (YYYY-MM-DD)', 400, 'VALIDATION_ERROR');
        }
        return await unit_repository_1.default.insertUnitSchedule(unitId, dateOnly);
    }
    // 특정 교육 일정 삭제
    async removeScheduleFromUnit(scheduleId) {
        if (!scheduleId || isNaN(Number(scheduleId))) {
            throw new AppError_1.default('유효하지 않은 일정 ID입니다.', 400, 'VALIDATION_ERROR');
        }
        return await unit_repository_1.default.deleteUnitSchedule(scheduleId);
    }
    // 부대 영구 삭제
    async removeUnitPermanently(id) {
        return await unit_repository_1.default.deleteUnitById(id);
    }
}
exports.default = new UnitService();
// CommonJS 호환
module.exports = new UnitService();
