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

// ✅ 수정: 스키마에 존재하는 군구분(Army, Navy)에 맞춰 한글 목록 제한
const UNIT_TYPES = ['육군', '해군'];

// ✅ 한글 -> Prisma Enum 매핑
const UNIT_TYPE_MAP = {
  '육군': 'Army',
  '해군': 'Navy'
};

const REGIONS = ['경기', '강원', '충북', '충남', '경북', '경남', '전북', '전남'];
const REGION_CITIES = {
  '경기': ['양주시', '파주시', '연천군', '포천시', '가평군'],
  '강원': ['철원군', '화천군', '양구군', '인제군', '고성군'],
};

// 랜덤 헬퍼 함수
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function main() {
  console.log('🌱 부대 데이터 시딩 시작 (기존 스키마 유지)...');

  // 기존 데이터 삭제
  await prisma.unit.deleteMany();

  const units = [];

  for (let i = 1; i <= 50; i++) {
    const typeKorean = sample(UNIT_TYPES);
    const wideArea = sample(Object.keys(REGION_CITIES));
    const region = sample(REGION_CITIES[wideArea] || ['시/군']);
    
    // 부대명 생성
    let name = '';
    if (typeKorean === '육군') name = `제${randomNum(1, 99)}보병사단`;
    else if (typeKorean === '해군') name = `제${randomNum(1, 3)}함대사령부`;
    name += ` (${randomNum(100, 999)}부대)`;

    // 랜덤 날짜 생성 (교육 기간 등)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + randomNum(1, 30));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 2); // 2박 3일

    // 랜덤 시간 생성 (근무 시간 등) - 임의의 날짜에 시간만 설정
    const setTime = (h, m) => {
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };

    units.push({
      name: name,
      unitType: UNIT_TYPE_MAP[typeKorean], // Army or Navy
      wideArea: wideArea,
      region: region,
      addressDetail: `${wideArea} ${region} ${sample(['평화로', '통일로', '충성로'])} ${randomNum(10, 500)}길 ${randomNum(1, 100)}`,
      
      // 담당자 정보
      officerName: sample(['김철수', '이영희', '박민수', '최성호', '정지훈']) + sample([' 대위', ' 중사', ' 상사']),
      officerPhone: `010-${randomNum(2000, 9999)}-${randomNum(2000, 9999)}`,
      officerEmail: `officer${i}@mil.kr`,

      // 위치 정보
      lat: 37.0 + (Math.random() * 2),
      lng: 127.0 + (Math.random() * 2),

      // 추가된 필드 데이터
      educationStart: startDate,
      educationEnd: endDate,
      workStartTime: setTime(9, 0),
      workEndTime: setTime(18, 0),
      lunchStartTime: setTime(12, 0),
      lunchEndTime: setTime(13, 0),
    });
  }

  await prisma.unit.createMany({ data: units });
  console.log(`✅ ${units.length}개의 부대 데이터가 생성되었습니다. (Army/Navy Only)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });