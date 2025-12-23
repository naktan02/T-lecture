// server/src/domains/unit/unit.mapper.js

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
  '교육불가일자': 'excludedDatesString', // 임시 필드명
  '근무시작시간': 'workStartTime',
  '근무종료시간': 'workEndTime',
  '점심시작시간': 'lunchStartTime',
  '점심종료시간': 'lunchEndTime',
};

const parseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const checkBool = (val) => {
  if (val === true || String(val).toUpperCase() === 'TRUE' || String(val).toUpperCase() === 'O') return true;
  return false;
};

const excelRowToRawUnit = (row) => {
  const data = {};
  
  // 1. 기본 매핑
  Object.keys(HEADER_MAP).forEach(kor => {
    if (row[kor] !== undefined) data[HEADER_MAP[kor]] = row[kor];
  });

  // 2. 군구분 변환
  const typeMap = { '육군': 'Army', '해군': 'Navy', '공군': 'AirForce', '해병대': 'Marine' };
  if (typeMap[data.unitType]) data.unitType = typeMap[data.unitType];

  // 3. 날짜 변환
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
  // 데이터가 있는 경우만 배열에 추가
  data.trainingLocations = (loc.originalPlace || loc.plannedCount > 0) ? [loc] : [];

  // 5. 불가일자 파싱 (콤마 구분 문자열 -> 날짜 객체 배열)
  const excludedDatesList = [];
  if (data.excludedDatesString) {
    String(data.excludedDatesString).split(',').forEach(s => {
      const d = parseDate(s.trim());
      if (d) excludedDatesList.push(d);
    });
  }
  // DB 저장용 구조로 변환 ({ create: [...] })
  data.excludedDates = { 
    create: excludedDatesList.map(d => ({ date: d })) 
  };
  delete data.excludedDatesString; // 임시 필드 삭제

  // 6. [핵심] 일정 자동 계산 로직
  const schedules = [];
  if (data.educationStart && data.educationEnd) {
    const current = new Date(data.educationStart);
    const end = new Date(data.educationEnd);
    
    // 불가일자 문자열 리스트 (비교용)
    const excludedStrs = excludedDatesList.map(d => d.toISOString().split('T')[0]);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      // 불가일자에 포함되지 않는 날만 일정으로 추가
      if (!excludedStrs.includes(dateStr)) {
        schedules.push({ date: new Date(current) });
      }
      current.setDate(current.getDate() + 1);
    }
  }
  data.schedules = { create: schedules };

  return data;
};

module.exports = { excelRowToRawUnit };