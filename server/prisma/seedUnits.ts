/* eslint-disable no-console */
import { PrismaClient, MilitaryType } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

// 엑셀 파일 경로
const EXCEL_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');

// === 파싱 헬퍼 함수들 ===

function parseTime(val: unknown): Date | null {
  if (!val) return null;
  const timeStr = String(val).trim();
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return new Date(2000, 0, 1, parseInt(match[1]), parseInt(match[2]), parseInt(match[3] || '0'));
  }
  return null;
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function parseUnitType(val: unknown): MilitaryType {
  if (!val) return 'Army';
  const v = String(val).trim();
  if (v.includes('육군') || v === 'Army') return 'Army';
  if (v.includes('해군') || v === 'Navy') return 'Navy';
  if (v.includes('공군') || v === 'AirForce') return 'AirForce';
  if (v.includes('해병') || v === 'Marines') return 'Marines';
  if (v.includes('국직') || v === 'MND') return 'MND';
  return 'Army';
}

function parseBool(val: unknown): boolean {
  if (!val) return false;
  const v = String(val).trim().toLowerCase();
  return ['o', 'yes', 'y', 'true', '1', 'v', '○', '예'].includes(v);
}

function parseNumber(val: unknown): number | null {
  if (!val) return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

async function main() {
  console.log('🚀 부대 데이터 시딩 시작 (Upsert 로직)... \n');
  console.log(`📂 엑셀 파일 로딩: ${EXCEL_PATH}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    console.error('❌ 엑셀 시트를 찾을 수 없습니다.');
    return;
  }

  // 헤더 행 찾기
  let headerRowIndex = 1;
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (headers.length > 0) return;
    let isHeader = false;
    row.eachCell((cell) => {
      if (cell.text?.trim() === '부대명') isHeader = true;
    });
    if (isHeader) {
      headerRowIndex = rowNumber;
      console.log(`🔎 헤더 행 발견: ${rowNumber}행`);
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text?.trim() || '';
      });
    }
  });

  // 데이터 행 파싱
  const unitDataList: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;

    const rowData: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = cell.text || '';
      }
    });

    if (rowData['부대명']) {
      unitDataList.push(rowData);
    }
  });

  console.log(`📋 부대 데이터 ${unitDataList.length}건 읽음. Upsert 중...`);

  let createdCount = 0;
  let updatedCount = 0;
  let scheduleCount = 0;
  let locationCount = 0;

  for (const row of unitDataList) {
    const name = row['부대명'];
    if (!name) continue;

    try {
      // 부대 데이터 준비
      const unitData = {
        name,
        unitType: parseUnitType(row['군구분']),
        wideArea: row['광역'] || null,
        region: row['지역'] || null,
        addressDetail: row['부대상세주소'] || null,
        lat: parseNumber(row['위도']) || 37.5,
        lng: parseNumber(row['경도']) || 127.0,
        educationStart: parseDate(row['교육시작일자']),
        educationEnd: parseDate(row['교육종료일자']),
        workStartTime: parseTime(row['근무시작시간']),
        workEndTime: parseTime(row['근무종료시간']),
        lunchStartTime: parseTime(row['점심시작시간']),
        lunchEndTime: parseTime(row['점심종료시간']),
        officerName: row['간부명'] || null,
        officerPhone: row['간부 전화번호'] || null,
        officerEmail: row['간부 이메일 주소'] || null,
        excludedDates: row['교육불가일자']
          ? row['교육불가일자']
              .split(/[,;]/)
              .map((d) => d.trim())
              .filter(Boolean)
          : [],
      };

      // 기존 부대 확인
      const existingUnit = await prisma.unit.findFirst({ where: { name } });

      let unit;
      if (existingUnit) {
        // 업데이트 (upsert)
        unit = await prisma.unit.update({
          where: { id: existingUnit.id },
          data: unitData,
        });
        updatedCount++;
      } else {
        // 새로 생성
        unit = await prisma.unit.create({ data: unitData });
        createdCount++;
      }

      // TrainingLocation: 기존 삭제 후 재생성
      await prisma.trainingLocation.deleteMany({ where: { unitId: unit.id } });
      await prisma.trainingLocation.create({
        data: {
          unitId: unit.id,
          originalPlace: row['기존교육장소'] || null,
          changedPlace: row['변경교육장소'] || null,
          hasInstructorLounge: parseBool(row['강사휴게실 여부']),
          hasWomenRestroom: parseBool(row['여자화장실 여부']),
          hasCateredMeals: parseBool(row['수탁급식여부']),
          hasHallLodging: parseBool(row['회관숙박여부']),
          allowsPhoneBeforeAfter: parseBool(row['사전사후 휴대폰 불출 여부']),
          plannedCount: parseNumber(row['계획인원']) || 0,
          actualCount: parseNumber(row['참여인원']) || 0,
          note: row['특이사항'] || null,
        },
      });
      locationCount++;

      // UnitSchedule: 기존 삭제 후 재생성 (배정 데이터는 CASCADE로 삭제됨)
      const startDate = parseDate(row['교육시작일자']);
      const endDate = parseDate(row['교육종료일자']);
      const excludedDatesStr = row['교육불가일자'] || '';

      if (startDate && endDate) {
        // 기존 배정 삭제 (cascade 관계가 아니므로 수동 삭제)
        const existingSchedules = await prisma.unitSchedule.findMany({
          where: { unitId: unit.id },
          select: { id: true },
        });

        if (existingSchedules.length > 0) {
          const scheduleIds = existingSchedules.map((s) => s.id);
          await prisma.instructorUnitAssignment.deleteMany({
            where: { unitScheduleId: { in: scheduleIds } },
          });
          await prisma.unitSchedule.deleteMany({ where: { unitId: unit.id } });
        }

        // 새 스케줄 생성 (교육불가일자 제외)
        const schedulesToCreate: { unitId: number; date: Date }[] = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const isExcluded = excludedDatesStr.includes(dateStr);

          if (!isExcluded) {
            schedulesToCreate.push({
              unitId: unit.id,
              date: new Date(current),
            });
          }
          current.setDate(current.getDate() + 1);
        }

        if (schedulesToCreate.length > 0) {
          await prisma.unitSchedule.createMany({ data: schedulesToCreate });
          scheduleCount += schedulesToCreate.length;
        }

        // 교육불가일자가 있으면 로그
        if (excludedDatesStr) {
          const totalDays =
            Math.ceil((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          console.log(
            `  📅 ${name}: 총 ${totalDays}일 중 ${schedulesToCreate.length}일 유효 (제외: ${excludedDatesStr})`,
          );
        }
      }
    } catch (e) {
      console.error(`❌ 부대 처리 실패: ${name}`, e);
    }
  }

  console.log(`\n✅ 부대 처리 완료`);
  console.log(`   - 신규 생성: ${createdCount}개`);
  console.log(`   - 업데이트: ${updatedCount}개`);
  console.log(`   - 교육장소: ${locationCount}개`);
  console.log(`   - 부대일정: ${scheduleCount}개\n`);

  console.log('Step 2: run `npm run seed:dashboard` to create assignments and stats.');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
/* eslint-enable no-console */
