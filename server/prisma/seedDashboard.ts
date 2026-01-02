import { PrismaClient, AssignmentState, AssignmentCategory } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

// 엑셀 파일 경로
const EXCEL_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');

/**
 * 랜덤 날짜 생성 (start ~ end 사이)
 */
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🚀 대시보드 테스트 데이터 시딩 시작...\n');

  // 1. 강사 및 부대 데이터 확인
  const instructors = await prisma.instructor.findMany({
    where: { profileCompleted: true }, // 프로필 완료된 강사만
    include: { user: true },
  });

  if (instructors.length === 0) {
    console.error('❌ 테스트할 강사 데이터가 없습니다. `npm run seed:users`를 먼저 실행해주세요.');
    return;
  }
  console.log(`📋 강사 ${instructors.length}명 확인됨`);

  // 2. 엑셀에서 부대 정보 읽기 및 생성
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
          changedPlace: row['변경교육장소'],
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
    } catch (e) {
      // console.error(`부대 생성 실패: ${name}`, e);
    }
  }
  console.log(`✅ 부대 ${createdUnits.length}개 처리 완료\n`);

  // 3. 배정 및 거리 데이터 생성
  console.log('📅 배정 및 거리 데이터 생성 중...');

  // 날짜 범위: 6개월 전 ~ 1개월 후
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let assignmentCount = 0;

  for (const instructor of instructors) {
    // 각 강사당 5~20개의 활동 생성
    const activityCount = Math.floor(Math.random() * 15) + 5;

    // 강사와 부대 간 거리 데이터도 생성 필요 (대시보드 통계용)
    if (createdUnits.length === 0) {
      console.error('❌ 생성된 부대가 없습니다. 엑셀을 확인하세요.');
      break;
    }
    // 랜덤하게 10개 부대와 거리 정보 연결
    const associatedUnits = createdUnits.sort(() => Math.random() - 0.5).slice(0, 20);

    for (const unit of associatedUnits) {
      // 거리 정보 (10km ~ 100km)
      await prisma.instructorUnitDistance.upsert({
        where: { userId_unitId: { userId: instructor.userId, unitId: unit.id } },
        update: {},
        create: {
          userId: instructor.userId,
          unitId: unit.id,
          distance: Math.floor(Math.random() * 90) + 10,
          duration: Math.floor(Math.random() * 60) + 30,
        },
      });
    }

    // Assignment loop
    for (let i = 0; i < activityCount; i++) {
      try {
        const targetUnit = associatedUnits[Math.floor(Math.random() * associatedUnits.length)];
        const date = getRandomDate(sixMonthsAgo, oneMonthLater);

        const isAccepted = Math.random() > 0.2;
        let state: AssignmentState = 'Pending';
        if (isAccepted) state = 'Accepted';
        else state = Math.random() > 0.5 ? 'Rejected' : 'Canceled';

        // Create UnitSchedule
        const schedule = await prisma.unitSchedule.create({
          data: {
            unitId: targetUnit.id,
            date: date,
          },
        });

        // Create Assignment
        await prisma.instructorUnitAssignment.create({
          data: {
            userId: instructor.userId,
            unitScheduleId: schedule.id,
            classification: 'Confirmed', // Valid enum
            state: state,
          },
        });
        assignmentCount++;
      } catch (err: any) {
        console.error(`❌ 배정 생성 실패 (Instructor: ${instructor.userId}):`, err.message);
      }
    }
  }

  console.log(`✅ 배정 ${assignmentCount}건 생성 완료\n`);

  console.log('='.repeat(50));
  console.log('🎉 대시보드 테스트 데이터 준비 완료');
  console.log('='.repeat(50));
  console.log('이제 서버를 실행하고 배치 작업을 돌리거나 대시보드를 확인하세요.');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
