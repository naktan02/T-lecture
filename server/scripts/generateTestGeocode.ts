// server/scripts/generateTestGeocode.ts
// 좌표 변환 테스트용 소규모 엑셀 데이터 생성
// 10개 부대: 5개 정상 주소 (좌표 변환 성공), 5개 잘못된 주소 (좌표 변환 실패)

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatTime = (hour: number, minute: number): string => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

async function main() {
  console.log('📊 좌표 변환 테스트용 엑셀 파일 생성');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대정보');

  // 헤더 (업데이트된 순서 - TrainingPeriod 시설 정보 먼저)
  const headers = [
    '부대명',
    '군구분',
    '광역',
    '지역',
    '부대주소',
    '부대주소(상세)',
    '교육시작일자',
    '교육종료일자',
    '교육불가일자',
    '근무시작시간',
    '근무종료시간',
    '점심시작시간',
    '점심종료시간',
    '간부명',
    '간부 전화번호',
    '간부 이메일 주소',
    '수탁급식여부',
    '회관숙박여부',
    '사전사후 휴대폰 불출 여부',
    '기존교육장소',
    '변경교육장소',
    '강사휴게실 여부',
    '여자화장실 여부',
    '계획인원',
    '참여인원',
    '특이사항',
  ];

  // 메타정보 행
  worksheet.getCell('A1').value = '좌표 변환 테스트용 데이터 (10개 부대)';
  worksheet.getCell('A2').value = '강의년도';
  worksheet.getCell('B2').value = 2026;
  worksheet.getCell('C2').value = `생성일: ${formatDate(new Date())}`;

  // 헤더 행 (3행)
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  });

  const startDate = new Date(Date.UTC(2026, 1, 10)); // 2026-02-10
  const endDate = new Date(Date.UTC(2026, 1, 12)); // 2026-02-12

  // 5개 정상 주소 (좌표 변환 성공 예상)
  const validAddresses = [
    {
      name: '테스트부대A',
      address: '서울특별시 강남구 테헤란로 152',
      wideArea: '서울특별시',
      region: '강남구',
    },
    {
      name: '테스트부대B',
      address: '경기도 성남시 분당구 판교역로 166',
      wideArea: '경기도',
      region: '성남시',
    },
    {
      name: '테스트부대C',
      address: '부산광역시 해운대구 해운대해변로 84',
      wideArea: '부산광역시',
      region: '해운대구',
    },
    {
      name: '테스트부대D',
      address: '대전광역시 유성구 대학로 99',
      wideArea: '대전광역시',
      region: '유성구',
    },
    {
      name: '테스트부대E',
      address: '인천광역시 연수구 송도과학로 32',
      wideArea: '인천광역시',
      region: '연수구',
    },
  ];

  // 5개 잘못된 주소 (좌표 변환 실패 예상)
  const invalidAddresses = [
    { name: '실패부대F', address: 'ㅁㄴㅇㄹ가나다라', wideArea: '없는지역', region: '없음' },
    {
      name: '실패부대G',
      address: '존재하지않는주소 12345',
      wideArea: '가상지역',
      region: '가상구',
    },
    { name: '실패부대H', address: 'xyz abc 123', wideArea: '영어지역', region: '영어구' },
    { name: '실패부대I', address: '@@#$%^&*()', wideArea: '특수문자', region: '특수구' },
    { name: '실패부대J', address: '', wideArea: '빈주소지역', region: '빈구' },
  ];

  let currentRow = 4;

  // 정상 주소 5개 생성
  for (let i = 0; i < validAddresses.length; i++) {
    const unit = validAddresses[i];
    const row = [
      unit.name,
      '육군', // 한글 군구분 테스트
      unit.wideArea,
      unit.region,
      unit.address,
      `본관 ${i + 1}층`,
      formatDate(startDate),
      formatDate(endDate),
      '', // 교육불가일자
      formatTime(9, 0),
      formatTime(18, 0),
      formatTime(12, 0),
      formatTime(13, 0),
      `담당관${i + 1}`,
      `010-1234-${String(1000 + i).padStart(4, '0')}`,
      `officer${i + 1}@test.mil.kr`,
      'O', // 수탁급식
      'O', // 회관숙박
      'O', // 휴대폰불출
      '연무장', // 기존교육장소
      '', // 변경교육장소
      'O', // 강사휴게실
      'O', // 여자화장실
      100, // 계획인원
      90, // 참여인원
      '', // 특이사항
    ];

    headers.forEach((_, colIndex) => {
      worksheet.getCell(currentRow, colIndex + 1).value = row[colIndex];
    });
    currentRow++;
  }

  // 잘못된 주소 5개 생성
  for (let i = 0; i < invalidAddresses.length; i++) {
    const unit = invalidAddresses[i];
    const row = [
      unit.name,
      '해군', // 한글 군구분 테스트
      unit.wideArea,
      unit.region,
      unit.address,
      '건물없음',
      formatDate(startDate),
      formatDate(endDate),
      '',
      formatTime(9, 0),
      formatTime(18, 0),
      formatTime(12, 0),
      formatTime(13, 0),
      `담당관${i + 6}`,
      `010-5678-${String(1000 + i).padStart(4, '0')}`,
      `officer${i + 6}@test.mil.kr`,
      'X', // 수탁급식
      'X', // 회관숙박
      'O', // 휴대폰불출
      '없는장소',
      '',
      'X', // 강사휴게실
      'X', // 여자화장실
      50,
      40,
      '좌표변환 실패 테스트용',
    ];

    headers.forEach((_, colIndex) => {
      worksheet.getCell(currentRow, colIndex + 1).value = row[colIndex];
    });
    currentRow++;
  }

  // 열 너비 조정
  worksheet.columns = headers.map((_, i) => ({ width: i === 4 ? 35 : 15 }));

  // 파일 저장
  const outputDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'units-geocode-test.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`✅ 파일 생성 완료: ${outputPath}`);
  console.log('');
  console.log('📋 테스트 데이터 내역:');
  console.log('  - 정상 주소 5개: 테스트부대A~E (좌표 변환 성공 예상)');
  console.log('  - 잘못된 주소 5개: 실패부대F~J (좌표 변환 실패 예상)');
  console.log('');
  console.log('⚠️ 테스트 전 KAKAO_REST_API_KEY 환경변수 설정 필요');
}

main().catch(console.error);
