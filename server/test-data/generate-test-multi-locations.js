// 여러 교육장소 테스트용 엑셀 생성 스크립트
const ExcelJS = require('exceljs');

async function generateTestData() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대 교육 정보');

  // 헤더 행 (3행에 위치, 1-2행은 메타정보)
  worksheet.getRow(1).values = ['부대 교육 정보 업로드 (다중 교육장소 테스트)'];
  worksheet.getRow(2).values = ['작성일: 2026-01-02'];

  // 컬럼 헤더 (COLUMN_MAPPING 참조)
  const headers = [
    '', // A열 비움
    '기존교육장소', // B열
    '부대명', // C열
    '지역', // D열
    '군구분', // E열
    '광역', // F열
    '부대상세주소', // G열
    '교육시작일자', // H열
    '교육종료일자', // I열
    '교육불가일자', // J열
    '근무시작시간', // K열
    '근무종료시간', // L열
    '점심시작시간', // M열
    '점심종료시간', // N열
    '간부명', // O열
    '간부 전화번호', // P열
    '간부 이메일 주소', // Q열
    '변경교육장소', // R열
    '강사휴게실 여부', // S열
    '여자화장실 여부', // T열
    '수탁급식여부', // U열
    '회관숙박여부', // V열
    '사전사후 휴대폰 불출 여부', // W열
    '계획인원', // X열
    '참여인원', // Y열
    '투입강사수', // Z열
    '특이사항', // AA열
  ];
  worksheet.getRow(3).values = headers;

  // 부대 이름 생성 (기존 "제N기갑여단" 스타일과 겹치지 않게)
  const unitPrefixes = [
    '알파',
    '브라보',
    '찰리',
    '델타',
    '에코',
    '폭스트롯',
    '골프',
    '호텔',
    '인디아',
    '줄리엣',
    '킬로',
    '리마',
    '마이크',
    '노벰버',
    '오스카',
    '파파',
    '퀘벡',
    '로미오',
    '시에라',
    '탱고',
  ];
  const unitTypes = ['독립여단', '특수단', '교육대', '훈련소', '지원단'];
  const militaryTypes = ['육군', '해군', '공군', '해병대', '국직부대'];
  const wideAreas = [
    '서울',
    '경기',
    '인천',
    '강원',
    '충북',
    '충남',
    '대전',
    '세종',
    '전북',
    '전남',
    '광주',
    '경북',
    '경남',
    '대구',
    '부산',
    '울산',
    '제주',
  ];
  const regions = [
    '강남구',
    '강북구',
    '마포구',
    '용산구',
    '성북구',
    '중구',
    '동작구',
    '관악구',
    '영등포구',
    '송파구',
  ];
  const places = [
    '대강당',
    '회의실A',
    '회의실B',
    '체육관',
    '강의실1',
    '강의실2',
    '세미나실',
    '대회의장',
    '소강당',
    '훈련장',
  ];

  let rowNum = 4;
  let unitIndex = 0;

  // 총 100행 생성 (약 50개 부대, 평균 2개 교육장소)
  while (rowNum <= 103) {
    const prefixIdx = unitIndex % unitPrefixes.length;
    const typeIdx = Math.floor(unitIndex / unitPrefixes.length) % unitTypes.length;
    const unitName = `${unitPrefixes[prefixIdx]}${unitTypes[typeIdx]}`;

    // 각 부대당 교육장소 개수 (1-4개)
    const locationCount = (unitIndex % 4) + 1;

    for (let loc = 0; loc < locationCount && rowNum <= 103; loc++) {
      const isFirstRow = loc === 0;
      const row = worksheet.getRow(rowNum);

      // A열 비움
      row.getCell(1).value = '';

      // 교육장소 정보 (B열)
      row.getCell(2).value = places[(unitIndex + loc) % places.length];

      if (isFirstRow) {
        // 부대 기본 정보는 첫 번째 행에만
        row.getCell(3).value = unitName; // 부대명
        row.getCell(4).value = regions[unitIndex % regions.length]; // 지역
        row.getCell(5).value = militaryTypes[unitIndex % militaryTypes.length]; // 군구분
        row.getCell(6).value = wideAreas[unitIndex % wideAreas.length]; // 광역
        row.getCell(7).value =
          `${wideAreas[unitIndex % wideAreas.length]} ${regions[unitIndex % regions.length]} ${unitName} 본부`; // 상세주소
        row.getCell(8).value = new Date(2026, 1, 1 + unitIndex); // 교육시작일자
        row.getCell(9).value = new Date(2026, 2, 1 + unitIndex); // 교육종료일자
        row.getCell(10).value = ''; // 교육불가일자
        row.getCell(11).value = '09:00'; // 근무시작시간
        row.getCell(12).value = '18:00'; // 근무종료시간
        row.getCell(13).value = '12:00'; // 점심시작시간
        row.getCell(14).value = '13:00'; // 점심종료시간
        row.getCell(15).value = `담당관${unitIndex + 1}`; // 간부명
        row.getCell(16).value =
          `010-${String(1000 + unitIndex).padStart(4, '0')}-${String((unitIndex * 11) % 10000).padStart(4, '0')}`; // 전화번호
        row.getCell(17).value = `officer${unitIndex + 1}@example.com`; // 이메일
      } else {
        // 추가 교육장소 행은 부대명 비움 (부대 정보 없음)
        row.getCell(3).value = ''; // 부대명 비움!
      }

      // 교육장소 상세 정보 (모든 행에 입력)
      row.getCell(18).value = loc > 0 ? `변경장소${loc}` : ''; // 변경교육장소
      row.getCell(19).value = (unitIndex + loc) % 2 === 0 ? 'O' : 'X'; // 강사휴게실
      row.getCell(20).value = (unitIndex + loc) % 3 === 0 ? 'o' : 'x'; // 여자화장실 (소문자 테스트)
      row.getCell(21).value = (unitIndex + loc) % 2 === 1 ? 'O' : 'X'; // 수탁급식
      row.getCell(22).value = 'X'; // 회관숙박
      row.getCell(23).value = 'O'; // 휴대폰 불출
      row.getCell(24).value = 50 + (unitIndex + loc) * 10; // 계획인원
      row.getCell(25).value = 45 + (unitIndex + loc) * 9; // 참여인원
      row.getCell(26).value = 2 + (loc % 3); // 투입강사수
      row.getCell(27).value = loc > 0 ? `추가 교육장소 ${loc}` : '기본 교육장소'; // 특이사항

      rowNum++;
    }
    unitIndex++;
  }

  // 파일 저장
  await workbook.xlsx.writeFile('./server/test-data/test-units-multi-locations.xlsx');
  console.log('생성 완료: test-units-multi-locations.xlsx');
  console.log(`총 ${rowNum - 4}개 행, ${unitIndex}개 부대 생성`);
}

generateTestData().catch(console.error);
