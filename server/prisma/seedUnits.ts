import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

// 엑셀 파일 경로
const EXCEL_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');

async function main() {
  console.log('🚀 부대 데이터 및 교육장소 시딩 시작 (Excel 기반)... \n');

  console.log(`📂 엑셀 파일 로딩: ${EXCEL_PATH}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const worksheet = workbook.getWorksheet(1); // 첫 번째 시트

  if (!worksheet) {
    console.error('❌ 엑셀 시트를 찾을 수 없습니다.');
    return;
  }

  // 헤더 행 찾기 (부대명 컬럼이 있는 행)
  let headerRowIndex = 1;
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    // 이미 헤더를 찾았으면 스킵
    if (headers.length > 0) return;

    let isHeader = false;
    row.eachCell((cell) => {
      const text = cell.text ? cell.text.trim() : '';
      if (text === '부대명') {
        isHeader = true;
      }
    });

    if (isHeader) {
      headerRowIndex = rowNumber;
      console.log(`🔎 헤더 행 발견: ${rowNumber}행`);
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text ? cell.text.trim() : '';
      });
    }
  });

  console.log('📊 Headers:', headers);

  const unitDataList: any[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return; // 헤더 및 그 이전 행 스킵
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = cell.text;
      }
    });
    // 빈 행이면 스킵
    if (!rowData['부대명'] && !rowData['name']) return;
    unitDataList.push(rowData);
  });

  console.log(`📋 부대 데이터 ${unitDataList.length}건 읽음. DB 생성 중...`);

  const createdUnits = [];
  for (const row of unitDataList) {
    const name = row['부대명'] || row['name'];
    if (!name) continue;

    try {
      let unit = await prisma.unit.findFirst({ where: { name } });

      if (!unit) {
        unit = await prisma.unit.create({
          data: {
            name,
            addressDetail: row['주소'] || row['address'] || '주소 미정',
            lat: row['위도'] || row['lat'] ? parseFloat(row['위도'] || row['lat']) : 37.5,
            lng: row['경도'] || row['lng'] ? parseFloat(row['경도'] || row['lng']) : 127.0,
            region: row['지역'] || row['region'] || '서울',
            unitType: 'Army', // MilitaryType enum
          },
        });
      }
      createdUnits.push(unit);

      // TrainingLocation 생성
      const parseBool = (val: any) => val === 'O';

      // 이미 존재하는지 확인하지 않고 create하면 에러날 수 있으므로 upsert나 create (test data라 그냥 create 시도하지만 중복 에러 가능성 있음)
      // clear_dashboard_data.ts로 다 지우고 할 것이므로 create해도 됨.
      // 하지만 unit이 이미 있으면(findFirst로 찾은 경우) trainingLocation도 있을 수 있음.
      // 안전하게 deleteMany 후 create 또는 upsert? TrainingLocation은 id가 PK. unitId는 FK.
      // unitId로 조회해서 있으면 skip?

      await prisma.trainingLocation.deleteMany({ where: { unitId: unit.id } });

      await prisma.trainingLocation.create({
        data: {
          unitId: unit.id,
          originalPlace: row['기존교육장소'],
          changedPlace: row['변경교육장소'], // 엑셀에 없을 수도 있음
          hasInstructorLounge: parseBool(row['강사휴게실 여부']),
          hasWomenRestroom: parseBool(row['여자화장실 여부']),
          hasCateredMeals: parseBool(row['수탁급식여부']),
          hasHallLodging: parseBool(row['회관숙박여부']),
          allowsPhoneBeforeAfter: parseBool(row['사전사후 휴대폰 불출 여부']),
          plannedCount: row['계획인원'] ? parseInt(row['계획인원']) : 0,
          actualCount: row['참여인원'] ? parseInt(row['참여인원']) : 0,
          instructorsNumbers: row['투입강사수'] ? parseInt(row['투입강사수']) : 0,
          note: row['특이사항'],
        },
      });

      // UnitSchedule 생성 (교육시작일자 ~ 교육종료일자)
      // 교육불가일자 고려: "YYYY-MM-DD, YYYY-MM-DD" 형태일 수 있다고 가정 (아니면 단일 날짜)
      const parseDate = (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const startDate = parseDate(row['교육시작일자']);
      const endDate = parseDate(row['교육종료일자']);
      const excludedDateRaw = row['교육불가일자'];

      const excludedDatesStr = excludedDateRaw ? String(excludedDateRaw) : '';
      // 콤마나 공백으로 분리? 일단 단순 포함 여부 체크나 파싱 필요.
      // 여기서는 간단히 문자열 포함 여부로 체크하거나, 정확한 포맷을 알 수 없으므로 우선 스킵하고
      // startDate ~ endDate 사이의 모든 날짜 생성.

      if (startDate && endDate) {
        // 기존 스케줄 삭제 (중복 방지)
        await prisma.unitSchedule.deleteMany({ where: { unitId: unit.id } });

        const schedulesToCreate = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
          // 날짜 복사
          const dateToSave = new Date(current);

          // 교육불가일자 체크 (단순 문자열 매칭)
          // 엑셀 포맷에 따라 다르겠지만, YYYY-MM-DD 문자열이 포함되어 있으면 제외
          const dateStr = dateToSave.toISOString().split('T')[0];
          const isExcluded = excludedDatesStr.includes(dateStr);

          // 서버 로직(UnitService)과 동일하게:
          // 모든 날짜에 대해 Schedule을 생성하되, isExcluded 플래그를 설정함.
          schedulesToCreate.push({
            unitId: unit.id,
            date: dateToSave,
            isExcluded: isExcluded,
          });

          // 하루 증가
          current.setDate(current.getDate() + 1);
        }

        if (schedulesToCreate.length > 0) {
          await prisma.unitSchedule.createMany({
            data: schedulesToCreate,
          });
          // console.log(`   └ 📅 일정 ${schedulesToCreate.length}일 생성`);
        }
      }
    } catch (e) {
      // console.error(`부대 생성 실패: ${name}`, e);
    }
  }
  console.log(`✅ 부대 및 일정 ${createdUnits.length}개 처리 완료\n`);

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
