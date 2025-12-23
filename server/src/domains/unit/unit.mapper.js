// server/src/domains/unit/unit.mapper.js

// 엑셀 헤더(한글) -> DB 필드명 매핑
const HEADER_MAP = {
  '부대명': 'name',
  '군구분': 'unitType',
  '광역': 'wideArea',
  '지역': 'region',
  '주소': 'addressDetail',
  '담당자명': 'officerName',
  '연락처': 'officerPhone',
  '이메일': 'officerEmail',
  '교육시작일자': 'educationStart',
  '교육종료일자': 'educationEnd',
  '교육불가일자': 'excludedDatesString', // 임시 필드
  '근무시작시간': 'workStartTime',
  '근무종료시간': 'workEndTime',
  '점심시작시간': 'lunchStartTime',
  '점심종료시간': 'lunchEndTime',
};

// 날짜 파싱 헬퍼
const parseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// 불리언 파싱 헬퍼
const checkBool = (val) => {
  if (val === true || String(val).toUpperCase() === 'TRUE' || String(val).toUpperCase() === 'O') return true;
  return false;
};

const excelRowToRawUnit = (row) => {
  const data = {};
  
  // 1. 기본 필드 매핑
  Object.keys(HEADER_MAP).forEach(kor => {
    if (row[kor] !== undefined) data[HEADER_MAP[kor]] = row[kor];
  });

  // 2. 군구분 영문 변환
  const typeMap = { '육군': 'Army', '해군': 'Navy', '공군': 'AirForce', '해병대': 'Marine' };
  if (typeMap[data.unitType]) data.unitType = typeMap[data.unitType];

  // 3. 날짜/시간 필드 변환
  ['educationStart', 'educationEnd', 'workStartTime', 'workEndTime', 'lunchStartTime', 'lunchEndTime'].forEach(f => {
    if (data[f]) data[f] = parseDate(data[f]);
  });

  // 4. 교육장소 처리
  const loc = {
    originalPlace: row['교육장소명'], changedPlace: row['변경교육장소명'],
    plannedCount: Number(row['계획인원'] || 0), instructorsNumbers: Number(row['투입강사수'] || 0),
    hasInstructorLounge: checkBool(row['강사휴게실여부']), hasWomenRestroom: checkBool(row['여자화장실여부']),
    hasCateredMeals: checkBool(row['수탁급식여부']), hasHallLodging: checkBool(row['회관숙박여부']),
    allowsPhoneBeforeAfter: checkBool(row['휴대폰불출여부']), note: row['비고']
  };
  // 장소 정보가 의미 있게 존재하는 경우에만 추가
  data.trainingLocations = (loc.originalPlace || loc.plannedCount > 0) ? [loc] : [];

  // 5. 불가일자 처리 (콤마 구분 문자열 -> Date 객체 배열)
  const excludedDateObjects = [];
  if (data.excludedDatesString) {
    String(data.excludedDatesString).split(',').forEach(s => {
      const d = parseDate(s.trim());
      if (d) excludedDateObjects.push(d);
    });
  }
  // 서비스/레포지토리로 넘길 때는 객체 배열 형태 ({ date: Date })
  data.excludedDates = excludedDateObjects.map(d => ({ date: d }));
  delete data.excludedDatesString; // 임시 필드 제거

  // 6. [핵심] 일정(Schedules) 자동 계산
  const schedules = [];
  if (data.educationStart && data.educationEnd) {
    const current = new Date(data.educationStart);
    const end = new Date(data.educationEnd);
    
    // 불가일 비교를 위해 문자열 리스트 생성
    const excludedStrs = excludedDateObjects.map(d => d.toISOString().split('T')[0]);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      // 불가일자에 포함되지 않는 날만 일정으로 추가
      if (!excludedStrs.includes(dateStr)) {
        schedules.push({ date: new Date(current) });
      }
      current.setDate(current.getDate() + 1);
    }
  }
  data.schedules = schedules; // { date: Date } 객체 배열

  return data;
};

module.exports = { excelRowToRawUnit };