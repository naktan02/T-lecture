// 테스트용 엑셀 파일 생성 스크립트 (100개 실제 데이터)
// - 시작 위치: B3부터 시작
// - 컬럼 순서: 무작위
// - 모든 필드 포함
// - 2박 3일 교육 일정
// 실행: npx tsx scripts/generate-test-excel-100.ts

import ExcelJS from 'exceljs';
import path from 'path';

// 실제와 유사한 데이터 생성용 배열
const UNIT_PREFIXES = [
  '제1',
  '제2',
  '제3',
  '제5',
  '제6',
  '제7',
  '제8',
  '제9',
  '제11',
  '제12',
  '제15',
  '제17',
  '제20',
  '제21',
  '제25',
  '제27',
  '제30',
  '제31',
  '제35',
  '제37',
  '제39',
  '제50',
  '제51',
  '제52',
  '제53',
  '제55',
  '제56',
];
const UNIT_TYPES_ARMY = [
  '보병사단',
  '기갑여단',
  '기계화보병사단',
  '포병여단',
  '공병여단',
  '통신여단',
  '군수지원사령부',
  '수도방위사령부',
  '특수전사령부',
  '항공작전사령부',
];
const UNIT_TYPES_NAVY = [
  '함대사령부',
  '해군작전사령부',
  '해병대사령부',
  '잠수함사령부',
  '해군교육사령부',
];

const WIDE_AREAS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원도',
  '충청북도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];
const REGIONS: Record<string, string[]> = {
  서울특별시: ['용산구', '종로구', '강남구', '서초구', '송파구', '마포구'],
  부산광역시: ['영도구', '해운대구', '남구', '동래구', '사하구'],
  대구광역시: ['동구', '서구', '남구', '북구', '수성구'],
  인천광역시: ['남동구', '연수구', '부평구', '계양구', '미추홀구'],
  광주광역시: ['동구', '서구', '남구', '북구', '광산구'],
  대전광역시: ['동구', '서구', '유성구', '대덕구', '중구'],
  울산광역시: ['중구', '남구', '동구', '북구', '울주군'],
  세종특별자치시: ['세종시'],
  경기도: [
    '수원시',
    '성남시',
    '고양시',
    '용인시',
    '부천시',
    '안산시',
    '화성시',
    '평택시',
    '의정부시',
    '파주시',
    '김포시',
    '광명시',
    '광주시',
    '군포시',
    '이천시',
    '양주시',
    '오산시',
    '안성시',
    '포천시',
    '동두천시',
  ],
  강원도: [
    '춘천시',
    '원주시',
    '강릉시',
    '동해시',
    '속초시',
    '삼척시',
    '태백시',
    '홍천군',
    '횡성군',
    '영월군',
    '평창군',
    '정선군',
    '철원군',
    '화천군',
    '양구군',
    '인제군',
    '고성군',
    '양양군',
  ],
  충청북도: [
    '청주시',
    '충주시',
    '제천시',
    '보은군',
    '옥천군',
    '영동군',
    '증평군',
    '진천군',
    '괴산군',
    '음성군',
    '단양군',
  ],
  충청남도: [
    '천안시',
    '공주시',
    '보령시',
    '아산시',
    '서산시',
    '논산시',
    '계룡시',
    '당진시',
    '금산군',
    '부여군',
    '서천군',
    '청양군',
    '홍성군',
    '예산군',
    '태안군',
  ],
  전라북도: [
    '전주시',
    '군산시',
    '익산시',
    '정읍시',
    '남원시',
    '김제시',
    '완주군',
    '진안군',
    '무주군',
    '장수군',
    '임실군',
    '순창군',
    '고창군',
    '부안군',
  ],
  전라남도: [
    '목포시',
    '여수시',
    '순천시',
    '나주시',
    '광양시',
    '담양군',
    '곡성군',
    '구례군',
    '고흥군',
    '보성군',
    '화순군',
    '장흥군',
    '강진군',
    '해남군',
    '영암군',
    '무안군',
    '함평군',
    '영광군',
    '장성군',
    '완도군',
    '진도군',
    '신안군',
  ],
  경상북도: [
    '포항시',
    '경주시',
    '김천시',
    '안동시',
    '구미시',
    '영주시',
    '영천시',
    '상주시',
    '문경시',
    '경산시',
    '군위군',
    '의성군',
    '청송군',
    '영양군',
    '영덕군',
    '청도군',
    '고령군',
    '성주군',
    '칠곡군',
    '예천군',
    '봉화군',
    '울진군',
    '울릉군',
  ],
  경상남도: [
    '창원시',
    '진주시',
    '통영시',
    '사천시',
    '김해시',
    '밀양시',
    '거제시',
    '양산시',
    '의령군',
    '함안군',
    '창녕군',
    '고성군',
    '남해군',
    '하동군',
    '산청군',
    '함양군',
    '거창군',
    '합천군',
  ],
  제주특별자치도: ['제주시', '서귀포시'],
};

const LAST_NAMES = [
  '김',
  '이',
  '박',
  '최',
  '정',
  '강',
  '조',
  '윤',
  '장',
  '임',
  '한',
  '오',
  '서',
  '신',
  '권',
  '황',
  '안',
  '송',
  '류',
  '홍',
];
const FIRST_NAMES = [
  '민준',
  '서준',
  '예준',
  '도윤',
  '시우',
  '주원',
  '하준',
  '지호',
  '지후',
  '준우',
  '준서',
  '도현',
  '건우',
  '우진',
  '현우',
  '서진',
  '지민',
  '지훈',
  '민재',
  '현준',
  '수호',
  '성민',
  '진우',
  '승현',
  '준혁',
  '정민',
  '재원',
  '영호',
  '상훈',
  '동현',
];

const PLACES = [
  '본부 대강당',
  '연병장',
  '체육관',
  '교육관',
  '회의실A',
  '회의실B',
  '다목적실',
  '강당',
  '교육센터',
  '훈련장',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone(): string {
  return `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

function randomEmail(name: string): string {
  const domains = ['army.mil.kr', 'navy.mil.kr', 'mnd.go.kr'];
  const firstName = name.substring(1);
  return `${firstName.toLowerCase()}${randomInt(1, 99)}@${randomChoice(domains)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateEducationDates(baseDate: Date): { start: string; end: string; excluded: string } {
  // 2박 3일 교육: 첫째날, 둘째날, 셋째날
  // 불가일자 없음 (3일 모두 교육)
  const start = new Date(baseDate);
  const end = new Date(baseDate);
  end.setDate(end.getDate() + 2); // 3일차

  return {
    start: formatDate(start),
    end: formatDate(end),
    excluded: '', // 불가일자 없음
  };
}

function generateUnit(index: number, baseDate: Date): Record<string, unknown> {
  const isArmy = Math.random() > 0.3; // 70% 육군, 30% 해군
  const unitType = isArmy ? 'Army' : 'Navy';
  const unitName = isArmy
    ? `${randomChoice(UNIT_PREFIXES)}${randomChoice(UNIT_TYPES_ARMY)}`
    : `${randomChoice(UNIT_PREFIXES)}${randomChoice(UNIT_TYPES_NAVY)}`;

  const wideArea = randomChoice(WIDE_AREAS);
  const region = randomChoice(REGIONS[wideArea] || ['중앙']);

  const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;
  const { start, end, excluded } = generateEducationDates(baseDate);

  // 좌표 (한반도 범위)
  const lat = 33.0 + Math.random() * 5; // 33~38
  const lng = 125.0 + Math.random() * 5; // 125~130

  return {
    부대명: unitName,
    군구분: unitType,
    광역: wideArea,
    지역: region,
    부대상세주소: `${wideArea} ${region} 군사로 ${randomInt(1, 999)}번길`,
    위도: Number(lat.toFixed(4)),
    경도: Number(lng.toFixed(4)),
    교육시작일자: start,
    교육종료일자: end,
    교육불가일자: excluded,
    근무시작시간: '09:00',
    근무종료시간: '18:00',
    점심시작시간: '12:00',
    점심종료시간: '13:00',
    간부명: officerName,
    '간부 전화번호': randomPhone(),
    '간부 이메일 주소': randomEmail(officerName),
    기존교육장소: randomChoice(PLACES),
    변경교육장소: Math.random() > 0.7 ? randomChoice(PLACES) : '',
    '강사휴게실 여부': Math.random() > 0.3 ? 'O' : 'X',
    '여자화장실 여부': Math.random() > 0.2 ? 'O' : 'X',
    수탁급식여부: Math.random() > 0.4 ? 'O' : 'X',
    회관숙박여부: Math.random() > 0.5 ? 'O' : 'X',
    '사전사후 휴대폰 불출 여부': Math.random() > 0.6 ? 'O' : 'X',
    계획인원: randomInt(20, 150),
    참여인원: randomInt(0, 50),
    투입강사수: randomInt(2, 8),
    특이사항: Math.random() > 0.7 ? `특이사항 ${index + 1}` : '',
  };
}

async function generateTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대정보');

  // 1-2행은 비워두기 (또는 제목/설명 넣기)
  worksheet.getCell('A1').value = '부대 교육 정보 업로드';
  worksheet.getCell('A2').value = `작성일: ${formatDate(new Date())}`;

  // 헤더 (순서 섞기) - 모든 필드 포함
  const allHeaders = [
    '기존교육장소', // 원래 뒤쪽
    '부대명',
    '지역',
    '교육종료일자',
    '군구분',
    '간부명',
    '광역',
    '교육시작일자',
    '부대상세주소',
    '위도',
    '경도',
    '교육불가일자',
    '근무시작시간',
    '근무종료시간',
    '점심시작시간',
    '점심종료시간',
    '간부 전화번호',
    '간부 이메일 주소',
    '변경교육장소',
    '강사휴게실 여부',
    '여자화장실 여부',
    '수탁급식여부',
    '회관숙박여부',
    '사전사후 휴대폰 불출 여부',
    '계획인원',
    '참여인원',
    '투입강사수',
    '특이사항',
  ];

  // B3부터 헤더 시작 (A열 비움)
  const startCol = 2; // B열
  const startRow = 3;

  allHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(startRow, startCol + index);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  // 100개 데이터 생성
  const baseDate = new Date('2025-02-01');

  for (let i = 0; i < 100; i++) {
    // 각 부대마다 날짜를 조금씩 다르게
    const unitBaseDate = new Date(baseDate);
    unitBaseDate.setDate(unitBaseDate.getDate() + Math.floor(i / 5) * 7); // 5개마다 1주일씩

    const unitData = generateUnit(i, unitBaseDate);

    allHeaders.forEach((header, colIndex) => {
      worksheet.getCell(startRow + 1 + i, startCol + colIndex).value = unitData[header] as
        | string
        | number
        | boolean;
    });
  }

  // 열 너비 조정
  worksheet.columns.forEach((column, index) => {
    if (index >= startCol - 1) {
      column.width = 18;
    }
  });

  // 파일 저장
  const filePath = path.join(__dirname, '..', 'test-data', 'test-units-100.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`✅ 테스트 엑셀 파일 생성 완료: ${filePath}`);
  console.log('\n📋 특징:');
  console.log('   - 시작 위치: B3 (A1이 아님)');
  console.log('   - 1-2행: 제목/설명');
  console.log('   - 컬럼 순서: 무작위 섞임');
  console.log('   - 필드 수: 28개 (모든 필드)');
  console.log('   - 교육일정: 2박 3일 (3일)');
  console.log(`\n📊 테스트 데이터: 100개 부대`);
}

generateTestExcel().catch(console.error);
