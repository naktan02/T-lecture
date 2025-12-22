// // prisma/seedunit.js
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// async function main() {
//   console.log('🧹 Cleaning up previous data... (기존 데이터 삭제 중)');
  
//   try {
//     // [순서 중요] 자식 테이블(참조하는 테이블)부터 먼저 지워야 합니다.
    
//     // 1. 배정 데이터(InstructorUnitAssignment) 삭제
//     // 이것이 UnitSchedule과 Instructor를 모두 잡고 있어서 가장 먼저 지워야 합니다.
//     await prisma.instructorUnitAssignment.deleteMany(); 

//     // 2. 강사 관련 하위 데이터 삭제
//     await prisma.instructorUnitDistance.deleteMany();
//     await prisma.instructorAvailability.deleteMany();
//     await prisma.instructorVirtue.deleteMany();
    
//     // 3. 부대 관련 데이터 삭제
//     await prisma.unitSchedule.deleteMany();     // 배정이 지워졌으므로 이제 삭제 가능
//     await prisma.trainingLocation.deleteMany();
//     await prisma.unit.deleteMany();

//     // 4. 강사 및 유저 삭제
//     await prisma.instructor.deleteMany();       // 배정/덕목 등이 지워졌으므로 삭제 가능
    
//     // 테스트용 유저(@test.com)만 골라서 삭제
//     await prisma.user.deleteMany({
//       where: { userEmail: { endsWith: '@test.com' } }
//     });

//   } catch (e) {
//     // 삭제 중 에러가 나면 더 진행하지 않고 멈추는 게 낫습니다.
//     console.error('⚠️ Cleanup failed. Stopping seed process.');
//     console.error(e);
//     process.exit(1); 
//   }

//   console.log('🌱 Seeding process started... (데이터 생성 시작)');

//   // 1. 기초 데이터 생성
//   let team = await prisma.team.findFirst({ where: { name: '교육1팀' } });
//   if (!team) {
//       team = await prisma.team.create({ data: { name: '교육1팀' } });
//   }
  
//   let virtue = await prisma.virtue.findFirst({ where: { name: '성실' } });
//   if (!virtue) {
//       virtue = await prisma.virtue.create({ data: { name: '성실' } });
//   }

//   // 기준 날짜: 내일
//   const startDateBase = new Date();
//   startDateBase.setDate(startDateBase.getDate() + 1);
//   startDateBase.setHours(0, 0, 0, 0);

//   // 2. 강사 생성 (10명)
//   const instructors = [];

//   for (let i = 1; i <= 10; i++) {
//     const category = i % 2 === 0 ? 'Main' : 'Assistant'; 
    
//     // 가능일 7일 생성
//     const availabilitiesData = [];
//     for (let d = 0; d < 7; d++) {
//         if (Math.random() > 0.2) { // 80% 확률로 가능
//             const date = new Date(startDateBase);
//             date.setDate(startDateBase.getDate() + d);
//             availabilitiesData.push({ availableOn: date });
//         }
//     }

//     const user = await prisma.user.create({
//       data: {
//         userEmail: `instructor${i}@test.com`,
//         password: '$2b$10$DUMMYHASHVALUE', 
//         name: `강사_${i}`,
//         userphoneNumber: `010-0000-00${i < 10 ? '0' + i : i}`,
//         status: 'APPROVED',
//         instructor: {
//           create: {
//             teamId: team.id,
//             category: category, 
//             location: '서울시 강남구',
//             profileCompleted: true,
//             virtues: {
//               create: { virtueId: virtue.id },
//             },
//             availabilities: { 
//                 create: availabilitiesData
//             }
//           },
//         },
//       },
//       include: { instructor: true }, 
//     });
    
//     if (user.instructor) {
//         instructors.push(user.instructor);
//     }
//   }
//   console.log(`✅ Created ${instructors.length} instructors with extended availability.`);

//   // 3. 부대 생성 (20개) - 2박 3일 일정
//   const units = [];
//   const regions = ['경기', '강원', '충청', '전라', '경상']; 
  
//   for (let i = 1; i <= 20; i++) {
//     const region = regions[i % regions.length];
    
//     // 교육장소 1~3개 랜덤
//     const locationCount = Math.floor(Math.random() * 3) + 1; 
//     const locationsToCreate = [];

//     for (let j = 1; j <= locationCount; j++) {
//         locationsToCreate.push({
//             originalPlace: `제${i}부대_${j}교육장`,
//             instructorsNumbers: Math.floor(Math.random() * 2) + 2, // 2~3명
//             plannedCount: Math.floor(Math.random() * 50) + 30,
//         });
//     }

//     // 2박 3일 스케줄 생성
//     const schedulesToCreate = [];
//     for (let d = 0; d < 3; d++) {
//         const date = new Date(startDateBase);
//         date.setDate(startDateBase.getDate() + d);
//         schedulesToCreate.push({ date: date });
//     }

//     const unit = await prisma.unit.create({
//       data: {
//         name: `제${i}부대`,
//         region: region,
//         addressDetail: `${region} 어딘가 ${i}번지`,
//         educationStart: schedulesToCreate[0].date,
//         educationEnd: schedulesToCreate[2].date, // 3일차 종료
        
//         schedules: {
//           create: schedulesToCreate,
//         },

//         trainingLocations: {
//             create: locationsToCreate
//         }
//       },
//       include: { schedules: true },
//     });
//     units.push(unit);
//   }
//   console.log(`✅ Created ${units.length} units with 2-night 3-day schedules.`);

//   // 4. 거리 데이터 생성
//   const distanceData = [];
//   for (const instructor of instructors) {
//     for (const unit of units) {
//       const randomDist = Math.floor(Math.random() * 95) + 5; 
      
//       distanceData.push({
//         userId: instructor.userId,
//         unitId: unit.id,
//         distance: randomDist,
//         duration: randomDist * 1.5 * 60,
//       });
//     }
//   }

//   await prisma.instructorUnitDistance.createMany({
//     data: distanceData,
//     skipDuplicates: true,
//   });
//   console.log(`✅ Created distance data.`);

//   console.log('🏁 Seeding finished.');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ 스키마의 Enum(Army, Navy)에 매핑하기 위한 설정
const UNIT_TYPES = ['육군', '해군'];
const UNIT_TYPE_MAP = {
  '육군': 'Army',
  '해군': 'Navy'
};

const REGIONS = ['경기', '강원', '충북', '충남', '경북', '경남', '전북', '전남'];
const REGION_CITIES = {
  '경기': ['양주시', '파주시', '연천군', '포천시', '가평군', '동두천시'],
  '강원': ['철원군', '화천군', '양구군', '인제군', '고성군', '춘천시'],
  '충북': ['충주시', '제천시', '괴산군'],
  '충남': ['계룡시', '논산시', '금산군'],
  '경북': ['포항시', '경주시', '영천시'],
  '경남': ['창원시', '진주시', '사천시'],
  '전북': ['전주시', '익산시', '군산시'],
  '전남': ['목포시', '여수시', '순천시'],
};

// 랜덤 헬퍼 함수
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const randomBool = () => Math.random() > 0.5;

// 날짜 생성 헬퍼
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// 시간 생성 헬퍼 (날짜는 오늘로 고정하고 시간만 설정)
const createTime = (hour, minute) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  console.log('🌱 부대 데이터 시딩 시작 (모든 필드 포함)...');

  // 1. 기존 데이터 삭제 (순서 중요: 자식 -> 부모)
  // Cascade 설정이 되어 있다면 부대만 지워도 되지만, 안전하게 명시적 삭제 권장
  try {
    await prisma.instructorUnitAssignment.deleteMany(); // 배정 정보 삭제 (참조 관계)
    await prisma.unitSchedule.deleteMany();
    await prisma.trainingLocation.deleteMany();
    await prisma.unit.deleteMany();
    console.log('🧹 기존 데이터 삭제 완료');
  } catch (e) {
    console.log('⚠️ 삭제 중 오류 발생 (무시하고 진행):', e.message);
  }

  const unitsData = [];

  for (let i = 1; i <= 50; i++) {
    const typeKorean = sample(UNIT_TYPES);
    const wideArea = sample(Object.keys(REGION_CITIES));
    const region = sample(REGION_CITIES[wideArea] || ['시/군']);
    
    // 1) 부대명 생성
    let name = '';
    if (typeKorean === '육군') name = `제${randomNum(1, 99)}보병사단`;
    else if (typeKorean === '해군') name = `제${randomNum(1, 3)}함대사령부`;
    name += ` (${randomNum(100, 999)}부대)`;

    // 2) 교육 기간 설정 (시작일: 오늘 ~ 30일 뒤, 종료일: 시작일 + 2~5일)
    const educationStart = addDays(new Date(), randomNum(1, 30));
    const educationEnd = addDays(educationStart, randomNum(2, 5));

    // 3) 교육장소 데이터 생성 (1~3개)
    const locationCount = randomNum(1, 3);
    const trainingLocations = [];
    for (let j = 1; j <= locationCount; j++) {
      trainingLocations.push({
        originalPlace: `제${j}교육장`,
        changedPlace: randomBool() ? `제${j}대강당` : null, // 가끔 변경됨
        hasInstructorLounge: randomBool(),
        hasWomenRestroom: randomBool(),
        hasCateredMeals: randomBool(),
        hasHallLodging: randomBool(),
        allowsPhoneBeforeAfter: randomBool(),
        plannedCount: randomNum(30, 100),
        actualCount: randomNum(25, 95),
        instructorsNumbers: randomNum(2, 5),
        note: randomBool() ? '프로젝터 점검 필요' : '',
      });
    }

    // 4) 일정 데이터 생성 (기간 내 랜덤 2~3일)
    const schedules = [];
    const scheduleCount = randomNum(2, 3);
    for (let k = 0; k < scheduleCount; k++) {
        // 교육 기간 내의 날짜로 생성
        schedules.push({
            date: addDays(educationStart, k)
        });
    }

    // 5) 부대 데이터 객체 생성
    unitsData.push({
      // 기본 정보
      name: name,
      unitType: UNIT_TYPE_MAP[typeKorean], // Army or Navy
      wideArea: wideArea,
      region: region,
      addressDetail: `${wideArea} ${region} ${sample(['평화로', '통일로', '충성로'])} ${randomNum(10, 500)}길 ${randomNum(1, 100)}`,
      lat: 36.0 + (Math.random() * 2), // 대략적인 위도
      lng: 127.0 + (Math.random() * 2), // 대략적인 경도

      // 기간 및 시간 정보
      educationStart: educationStart,
      educationEnd: educationEnd,
      workStartTime: createTime(9, 0),   // 09:00
      workEndTime: createTime(18, 0),    // 18:00
      lunchStartTime: createTime(12, 0), // 12:00
      lunchEndTime: createTime(13, 0),   // 13:00

      // 담당자 정보
      officerName: sample(['김철수', '이영희', '박민수', '최성호', '정지훈']) + sample([' 대위', ' 중사', ' 상사']),
      officerPhone: `010-${randomNum(2000, 9999)}-${randomNum(2000, 9999)}`,
      officerEmail: `officer${i}@mil.kr`,

      // 관계 데이터 (Nested Write)
      trainingLocations: {
        create: trainingLocations
      },
      schedules: {
        create: schedules
      }
    });
  }

  // 데이터 삽입 (createMany는 nested write를 지원하지 않으므로, 반복문으로 create 실행)
  // 또는 $transaction 사용
  console.log(`💾 ${unitsData.length}개 부대 데이터 저장 중...`);
  
  await prisma.$transaction(
    unitsData.map(unit => prisma.unit.create({ data: unit }))
  );

  console.log(`✅ 모든 부대 데이터 시딩 완료!`);
}

main()
  .catch((e) => {
    console.error('❌ 시딩 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });