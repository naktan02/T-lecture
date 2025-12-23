const HEADER_MAP = {
  '부대명': 'name', '군구분': 'unitType', '광역': 'wideArea', '지역': 'region', '주소': 'addressDetail',
  '담당자명': 'officerName', '연락처': 'officerPhone', '이메일': 'officerEmail',
  '교육시작일자': 'educationStart', '교육종료일자': 'educationEnd', '교육불가일자': 'excludedDatesString',
  '근무시작시간': 'workStartTime', '근무종료시간': 'workEndTime', '점심시작시간': 'lunchStartTime', '점심종료시간': 'lunchEndTime',
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
  Object.keys(HEADER_MAP).forEach(k => { if (row[k] !== undefined) data[HEADER_MAP[k]] = row[k]; });

  const typeMap = { '육군': 'Army', '해군': 'Navy', '공군': 'AirForce', '해병대': 'Marine' };
  if (typeMap[data.unitType]) data.unitType = typeMap[data.unitType];

  ['educationStart', 'educationEnd', 'workStartTime', 'workEndTime', 'lunchStartTime', 'lunchEndTime'].forEach(f => {
    if (data[f]) data[f] = parseDate(data[f]);
  });

  // 교육장소
  const loc = {
    originalPlace: row['교육장소명'], changedPlace: row['변경교육장소명'],
    plannedCount: Number(row['계획인원']||0), instructorsNumbers: Number(row['투입강사수']||0),
    hasInstructorLounge: checkBool(row['강사휴게실여부']), hasWomenRestroom: checkBool(row['여자화장실여부']),
    hasCateredMeals: checkBool(row['수탁급식여부']), hasHallLodging: checkBool(row['회관숙박여부']),
    allowsPhoneBeforeAfter: checkBool(row['휴대폰불출여부']), note: row['비고']
  };
  data.trainingLocations = (loc.originalPlace || loc.plannedCount > 0) ? [{ ...loc }] : [];

  // 불가일자 처리 및 일정 자동 생성
  const excludedDates = [];
  if (data.excludedDatesString) {
    String(data.excludedDatesString).split(',').forEach(s => {
      const d = parseDate(s.trim());
      if (d) excludedDates.push({ date: d });
    });
  }
  data.excludedDates = excludedDates; // Repository용 구조

  const schedules = [];
  if (data.educationStart && data.educationEnd) {
    const current = new Date(data.educationStart);
    const end = new Date(data.educationEnd);
    const excludedStrs = excludedDates.map(ed => ed.date.toISOString().split('T')[0]);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (!excludedStrs.includes(dateStr)) {
        schedules.push({ date: new Date(current) });
      }
      current.setDate(current.getDate() + 1);
    }
  }
  data.schedules = schedules; // Repository용 구조

  return data;
};

module.exports = { excelRowToRawUnit };