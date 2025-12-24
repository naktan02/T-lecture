// client/src/features/settings/ui/template-editor/variableConfig.ts

export interface VariableDefinition {
  key: string;
  label: string;
  icon: string;
  description?: string;
  isFormatVariable?: boolean; // 포맷 옵션이 필요한 변수
  formatPlaceholders?: string[]; // 포맷에서 사용 가능한 플레이스홀더
}

export interface VariableCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  variables: VariableDefinition[];
}

// ============================================
// Unit (부대) - 모든 DB 열
// ============================================
const UNIT_VARIABLES: VariableDefinition[] = [
  { key: 'unit.unitType', label: '군구분', icon: '🎖️', description: '육군/해군' },
  { key: 'unit.name', label: '부대명', icon: '🏛️' },
  { key: 'unit.wideArea', label: '광역', icon: '🗺️' },
  { key: 'unit.region', label: '지역', icon: '📍' },
  { key: 'unit.addressDetail', label: '부대상세주소', icon: '🏠' },
  { key: 'unit.lat', label: '위도', icon: '📐' },
  { key: 'unit.lng', label: '경도', icon: '📐' },
  { key: 'unit.educationStart', label: '교육시작일자', icon: '📅' },
  { key: 'unit.educationEnd', label: '교육종료일자', icon: '📅' },
  { key: 'unit.workStartTime', label: '근무시작시간', icon: '⏰' },
  { key: 'unit.workEndTime', label: '근무종료시간', icon: '⏰' },
  { key: 'unit.lunchStartTime', label: '점심시작시간', icon: '🍽️' },
  { key: 'unit.lunchEndTime', label: '점심종료시간', icon: '🍽️' },
  { key: 'unit.officerName', label: '간부명', icon: '👔' },
  { key: 'unit.officerPhone', label: '간부 전화번호', icon: '📞' },
  { key: 'unit.officerEmail', label: '간부 이메일', icon: '✉️' },
];

// ============================================
// TrainingLocation (교육장소) - 모든 DB 열
// ============================================
const LOCATION_VARIABLES: VariableDefinition[] = [
  { key: 'location.originalPlace', label: '기존교육장소', icon: '📍' },
  { key: 'location.changedPlace', label: '변경교육장소', icon: '📍' },
  { key: 'location.hasInstructorLounge', label: '강사휴게실 여부', icon: '🛋️' },
  { key: 'location.hasWomenRestroom', label: '여자화장실 여부', icon: '🚻' },
  { key: 'location.hasCateredMeals', label: '수탁급식여부', icon: '🍱' },
  { key: 'location.hasHallLodging', label: '회관숙박여부', icon: '🏨' },
  { key: 'location.allowsPhoneBeforeAfter', label: '사전사후 휴대폰 불출 여부', icon: '📱' },
  { key: 'location.plannedCount', label: '계획인원', icon: '👥' },
  { key: 'location.actualCount', label: '참여인원', icon: '👥' },
  { key: 'location.instructorsNumbers', label: '투입강사수', icon: '👨‍🏫' },
  { key: 'location.note', label: '특이사항', icon: '📝' },
];

// ============================================
// 본인 (메시지 수신자)
// ============================================
const SELF_VARIABLES: VariableDefinition[] = [
  { key: 'self.name', label: '본인 이름', icon: '👤' },
  { key: 'self.phone', label: '본인 전화번호', icon: '📱' },
  { key: 'self.category', label: '본인 분류', icon: '🏷️', description: '주강사/보조강사/실습' },
  { key: 'self.virtues', label: '본인 가능과목', icon: '📚' },
];

// ============================================
// 동료 (포맷 변수)
// ============================================
const COLLEAGUE_VARIABLES: VariableDefinition[] = [
  {
    key: 'colleagues',
    label: '같은장소 동료 목록',
    icon: '👥',
    description: '같은 교육장소에 배정된 동료들',
    isFormatVariable: true,
    formatPlaceholders: ['index', 'name', 'phone', 'category', 'virtues'],
  },
  {
    key: 'allColleagues',
    label: '같은부대 전체동료 목록',
    icon: '👥',
    description: '팀장용 - 같은 부대 모든 장소의 강사들',
    isFormatVariable: true,
    formatPlaceholders: ['index', 'name', 'phone', 'category', 'virtues', 'location'],
  },
];

// ============================================
// 카테고리 정의
// ============================================
export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'unit',
    label: '부대',
    icon: '🏛️',
    color: '#3b82f6', // blue
    variables: UNIT_VARIABLES,
  },
  {
    id: 'location',
    label: '교육장소',
    icon: '📍',
    color: '#22c55e', // green
    variables: LOCATION_VARIABLES,
  },
  {
    id: 'self',
    label: '본인',
    icon: '👤',
    color: '#8b5cf6', // purple
    variables: SELF_VARIABLES,
  },
  {
    id: 'colleagues',
    label: '동료',
    icon: '👥',
    color: '#f59e0b', // amber
    variables: COLLEAGUE_VARIABLES,
  },
];

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 변수 키로 변수 정보 찾기
 */
export const findVariableByKey = (key: string): VariableDefinition | undefined => {
  for (const category of VARIABLE_CATEGORIES) {
    const found = category.variables.find((v) => v.key === key);
    if (found) return found;
  }
  return undefined;
};

/**
 * 포맷 변수인지 확인
 */
export const isFormatVariable = (key: string): boolean => {
  const variable = findVariableByKey(key);
  return variable?.isFormatVariable === true;
};

/**
 * 포맷 변수에서 key와 format 추출
 * 예: "colleagues:format={index}. {name}" → { key: "colleagues", format: "{index}. {name}" }
 */
export const parseFormatVariable = (rawKey: string): { key: string; format: string | null } => {
  const match = rawKey.match(/^(\w+):format=(.+)$/);
  if (match) {
    return { key: match[1], format: match[2] };
  }
  return { key: rawKey, format: null };
};

/**
 * 모든 변수 키 목록 반환
 */
export const getAllVariableKeys = (): string[] => {
  const keys: string[] = [];
  for (const category of VARIABLE_CATEGORIES) {
    keys.push(...category.variables.map((v) => v.key));
  }
  return keys;
};

// ============================================
// 미리보기용 샘플 데이터
// ============================================
export const SAMPLE_DATA: Record<string, string> = {
  // Unit
  'unit.unitType': '육군',
  'unit.name': '제12사단',
  'unit.wideArea': '강원',
  'unit.region': '인제군',
  'unit.addressDetail': '인제읍 이평로 255',
  'unit.lat': '38.0697',
  'unit.lng': '128.1705',
  'unit.educationStart': '2024-11-17',
  'unit.educationEnd': '2024-11-19',
  'unit.workStartTime': '09:00',
  'unit.workEndTime': '16:00',
  'unit.lunchStartTime': '11:30',
  'unit.lunchEndTime': '13:00',
  'unit.officerName': '대위 이용준',
  'unit.officerPhone': '010-6640-9433',
  'unit.officerEmail': 'officer@army.mil',
  // Location
  'location.originalPlace': '교육관',
  'location.changedPlace': '',
  'location.hasInstructorLounge': 'O',
  'location.hasWomenRestroom': 'O',
  'location.hasCateredMeals': 'O',
  'location.hasHallLodging': 'O',
  'location.allowsPhoneBeforeAfter': '가능',
  'location.plannedCount': '75',
  'location.actualCount': '75',
  'location.instructorsNumbers': '3',
  'location.note': 'TV, 스피커, HDMI, 마이크 있음',
  // Self
  'self.name': '유혜경',
  'self.phone': '010-1234-5678',
  'self.category': '주강사',
  'self.virtues': '협력, 정의, 리더십',
};

/**
 * 포맷 변수 샘플 렌더링
 */
export const renderFormatVariableSample = (format: string): string => {
  const sampleColleagues = [
    {
      index: 1,
      name: '도혜승',
      phone: '010-6254-1209',
      category: '부강사',
      virtues: '협력, 정의, 신규교안',
      location: '교육관',
    },
    {
      index: 2,
      name: '김철수',
      phone: '010-9876-5432',
      category: '보조강사',
      virtues: '리더십, 소통',
      location: '체육관',
    },
  ];

  return sampleColleagues
    .map((colleague) => {
      let line = format;
      line = line.replace(/\{index\}/g, String(colleague.index));
      line = line.replace(/\{name\}/g, colleague.name);
      line = line.replace(/\{phone\}/g, colleague.phone);
      line = line.replace(/\{category\}/g, colleague.category);
      line = line.replace(/\{virtues\}/g, colleague.virtues);
      line = line.replace(/\{location\}/g, colleague.location);
      return line;
    })
    .join('\n');
};

// 기존 변수 키 → 새 변수 키 매핑 (하위 호환성)
export const LEGACY_KEY_MAP: Record<string, string> = {
  instructorName: 'self.name',
  unitName: 'unit.name',
  date: 'unit.educationStart',
  location: 'location.originalPlace',
  time: 'unit.workStartTime',
  officerName: 'unit.officerName',
  officerPhone: 'unit.officerPhone',
  address: 'unit.addressDetail',
};

export const normalizeKey = (key: string): string => {
  return LEGACY_KEY_MAP[key] || key;
};
