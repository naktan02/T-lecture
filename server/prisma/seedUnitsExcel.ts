// server/prisma/seedUnitsExcel.ts
import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import { MilitaryType } from '../src/generated/prisma/client.js';
import ExcelJS from 'exceljs';
import path from 'path';

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

interface RowData {
  부대명?: string;
  기존교육장소?: string;
  [key: string]: string | undefined;
}

async function main() {
  console.log('🚀 부대 데이터 시딩 시작 (다중 교육장소 지원)... \n');
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

  // 데이터 행 파싱 (모든 행 포함, 부대명 없는 행도)
  const allRows: RowData[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;

    const rowData: RowData = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = cell.text || '';
      }
    });

    // 교육장소 정보가 있는 행만 포함
    if (rowData['부대명'] || rowData['기존교육장소']) {
      allRows.push(rowData);
    }
  });

  console.log(`📋 전체 행 ${allRows.length}건 읽음. 다중 교육장소 처리 중...`);

  let createdCount = 0;
  let updatedCount = 0;
  let scheduleCount = 0;
  let locationCount = 0;
  let currentUnitId: number | null = null;
  let currentUnitName: string | null = null;

  for (const row of allRows) {
    const name = row['부대명'];

    try {
      if (name) {
        // 새 부대 시작 (부대명이 있는 행)
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
                .map((d: string) => d.trim())
                .filter(Boolean)
            : [],
        };

        // 기존 부대 확인
        const existingUnit = await prisma.unit.findFirst({ where: { name } });

        let unit;
        if (existingUnit) {
          unit = await prisma.unit.update({
            where: { id: existingUnit.id },
            data: unitData,
          });
          updatedCount++;

          // 기존 교육장소 삭제 (새로 생성)
          await prisma.trainingLocation.deleteMany({ where: { unitId: unit.id } });
        } else {
          unit = await prisma.unit.create({ data: unitData });
          createdCount++;
        }

        currentUnitId = unit.id;
        currentUnitName = name;

        // UnitSchedule 생성
        const startDate = parseDate(row['교육시작일자']);
        const endDate = parseDate(row['교육종료일자']);
        const excludedDatesStr = row['교육불가일자'] || '';

        if (startDate && endDate) {
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

          if (excludedDatesStr) {
            const totalDays =
              Math.ceil((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            console.log(`  📅 ${name}: ${totalDays}일 중 ${schedulesToCreate.length}일 유효`);
          }
        }
      }

      // 교육장소 생성 (부대명 있는 행과 없는 행 모두)
      if (currentUnitId && row['기존교육장소']) {
        await prisma.trainingLocation.create({
          data: {
            unitId: currentUnitId,
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

        // 추가 교육장소 로그
        if (!name) {
          console.log(`  📍 ${currentUnitName}: 추가 교육장소 "${row['기존교육장소']}"`);
        }
      }
    } catch (e) {
      console.error(`❌ 처리 실패: ${name || '추가 교육장소'}`, e);
    }
  }

  console.log(`\n✅ 부대 처리 완료`);
  console.log(`   - 신규 생성: ${createdCount}개`);
  console.log(`   - 업데이트: ${updatedCount}개`);
  console.log(`   - 교육장소: ${locationCount}개`);
  console.log(`   - 부대일정: ${scheduleCount}개\n`);

  // 다중 교육장소 검증
  const multiLocationUnits = await prisma.unit.findMany({
    where: {
      trainingLocations: { some: {} },
    },
    include: {
      _count: { select: { trainingLocations: true } },
    },
    orderBy: {
      trainingLocations: { _count: 'desc' },
    },
    take: 5,
  });

  console.log('📊 교육장소 개수 상위 5개 부대:');
  for (const u of multiLocationUnits) {
    console.log(`   - ${u.name}: ${u._count.trainingLocations}개`);
  }

  console.log('\nStep 2: run `npm run seed:dashboard` to create assignments and stats.');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
