// server/prisma/seedUnits.ts
// 부대 시드 데이터 생성: 2026년 1~2월 100개 부대
// 실행: npx tsx prisma/seedUnits.ts

/* eslint-disable no-console */

import 'dotenv/config';
import { MilitaryType } from '../src/generated/prisma/client.js';
import prisma from '../src/libs/prisma.js';
import axios from 'axios';
import distanceService from '../src/domains/distance/distance.service.js';

// 전국 실제 도로명주소 100개 (Kakao API로 좌표 변환)
const REAL_ADDRESSES: { address: string; wideArea: string; region: string }[] = [
  // 서울특별시 (15곳)
  { address: '서울특별시 강남구 테헤란로 152', wideArea: '서울특별시', region: '강남구' },
  { address: '서울특별시 서초구 서초대로 396', wideArea: '서울특별시', region: '서초구' },
  { address: '서울특별시 송파구 올림픽로 300', wideArea: '서울특별시', region: '송파구' },
  { address: '서울특별시 마포구 월드컵북로 396', wideArea: '서울특별시', region: '마포구' },
  { address: '서울특별시 영등포구 여의대로 108', wideArea: '서울특별시', region: '영등포구' },
  { address: '서울특별시 종로구 세종대로 209', wideArea: '서울특별시', region: '종로구' },
  { address: '서울특별시 용산구 한강대로 405', wideArea: '서울특별시', region: '용산구' },
  { address: '서울특별시 광진구 능동로 120', wideArea: '서울특별시', region: '광진구' },
  { address: '서울특별시 강서구 공항대로 247', wideArea: '서울특별시', region: '강서구' },
  { address: '서울특별시 강동구 천호대로 1017', wideArea: '서울특별시', region: '강동구' },
  { address: '서울특별시 노원구 동일로 1414', wideArea: '서울특별시', region: '노원구' },
  { address: '서울특별시 은평구 은평로 195', wideArea: '서울특별시', region: '은평구' },
  { address: '서울특별시 관악구 관악로 145', wideArea: '서울특별시', region: '관악구' },
  { address: '서울특별시 동대문구 천호대로 145', wideArea: '서울특별시', region: '동대문구' },
  { address: '서울특별시 성북구 성북로 76', wideArea: '서울특별시', region: '성북구' },

  // 경기도 (20곳)
  { address: '경기도 성남시 분당구 판교역로 166', wideArea: '경기도', region: '성남시 분당구' },
  { address: '경기도 수원시 영통구 광교로 156', wideArea: '경기도', region: '수원시 영통구' },
  { address: '경기도 수원시 팔달구 효원로 1', wideArea: '경기도', region: '수원시 팔달구' },
  { address: '경기도 용인시 처인구 중부대로 1199', wideArea: '경기도', region: '용인시 처인구' },
  { address: '경기도 고양시 일산동구 중앙로 1286', wideArea: '경기도', region: '고양시 일산동구' },
  { address: '경기도 고양시 덕양구 고양대로 1955', wideArea: '경기도', region: '고양시 덕양구' },
  { address: '경기도 파주시 문발로 242', wideArea: '경기도', region: '파주시' },
  { address: '경기도 화성시 남양읍 시청로 159', wideArea: '경기도', region: '화성시' },
  { address: '경기도 안양시 동안구 시민대로 230', wideArea: '경기도', region: '안양시 동안구' },
  { address: '경기도 부천시 길주로 210', wideArea: '경기도', region: '부천시' },
  { address: '경기도 안산시 단원구 광덕대로 142', wideArea: '경기도', region: '안산시 단원구' },
  { address: '경기도 의정부시 청사로 1', wideArea: '경기도', region: '의정부시' },
  { address: '경기도 남양주시 경춘로 1037', wideArea: '경기도', region: '남양주시' },
  { address: '경기도 평택시 평택로 51', wideArea: '경기도', region: '평택시' },
  { address: '경기도 시흥시 시청로 20', wideArea: '경기도', region: '시흥시' },
  { address: '경기도 김포시 걸포로 170', wideArea: '경기도', region: '김포시' },
  { address: '경기도 광주시 파발로 155', wideArea: '경기도', region: '광주시' },
  { address: '경기도 군포시 청백리길 6', wideArea: '경기도', region: '군포시' },
  { address: '경기도 오산시 성호대로 141', wideArea: '경기도', region: '오산시' },
  { address: '경기도 이천시 부악로 40', wideArea: '경기도', region: '이천시' },

  // 인천광역시 (8곳)
  { address: '인천광역시 연수구 컨벤시아대로 165', wideArea: '인천광역시', region: '연수구' },
  { address: '인천광역시 남동구 예술로 198', wideArea: '인천광역시', region: '남동구' },
  { address: '인천광역시 부평구 부평대로 168', wideArea: '인천광역시', region: '부평구' },
  { address: '인천광역시 계양구 계양대로 168', wideArea: '인천광역시', region: '계양구' },
  { address: '인천광역시 서구 서곶로 307', wideArea: '인천광역시', region: '서구' },
  { address: '인천광역시 미추홀구 석정로 229', wideArea: '인천광역시', region: '미추홀구' },
  { address: '인천광역시 동구 샛골로 130', wideArea: '인천광역시', region: '동구' },
  { address: '인천광역시 중구 신포로27번길 80', wideArea: '인천광역시', region: '중구' },

  // 강원특별자치도 (8곳)
  { address: '강원특별자치도 춘천시 중앙로 1', wideArea: '강원특별자치도', region: '춘천시' },
  { address: '강원특별자치도 원주시 서원대로 158', wideArea: '강원특별자치도', region: '원주시' },
  { address: '강원특별자치도 강릉시 강릉대로 33', wideArea: '강원특별자치도', region: '강릉시' },
  { address: '강원특별자치도 속초시 중앙로 183', wideArea: '강원특별자치도', region: '속초시' },
  { address: '강원특별자치도 동해시 천곡로 77', wideArea: '강원특별자치도', region: '동해시' },
  { address: '강원특별자치도 삼척시 중앙로 296', wideArea: '강원특별자치도', region: '삼척시' },
  { address: '강원특별자치도 홍천군 홍천로 49', wideArea: '강원특별자치도', region: '홍천군' },
  { address: '강원특별자치도 횡성군 횡성로 111', wideArea: '강원특별자치도', region: '횡성군' },

  // 충청남도 (8곳)
  { address: '충청남도 천안시 동남구 대흥로 215', wideArea: '충청남도', region: '천안시 동남구' },
  { address: '충청남도 천안시 서북구 번영로 208', wideArea: '충청남도', region: '천안시 서북구' },
  { address: '충청남도 공주시 봉황로 1', wideArea: '충청남도', region: '공주시' },
  { address: '충청남도 보령시 성주산로 77', wideArea: '충청남도', region: '보령시' },
  { address: '충청남도 아산시 번영로 224', wideArea: '충청남도', region: '아산시' },
  { address: '충청남도 논산시 시민로210번길 9', wideArea: '충청남도', region: '논산시' },
  { address: '충청남도 계룡시 장안로 46', wideArea: '충청남도', region: '계룡시' },
  { address: '충청남도 서산시 관아문길 1', wideArea: '충청남도', region: '서산시' },

  // 충청북도 (7곳)
  { address: '충청북도 청주시 상당구 상당로 155', wideArea: '충청북도', region: '청주시 상당구' },
  {
    address: '충청북도 청주시 흥덕구 강내면 청주역로 71',
    wideArea: '충청북도',
    region: '청주시 흥덕구',
  },
  { address: '충청북도 충주시 으뜸로 21', wideArea: '충청북도', region: '충주시' },
  { address: '충청북도 제천시 내토로 295', wideArea: '충청북도', region: '제천시' },
  { address: '충청북도 진천군 진천읍 중앙서로 11', wideArea: '충청북도', region: '진천군' },
  { address: '충청북도 음성군 음성읍 수정로 38', wideArea: '충청북도', region: '음성군' },
  { address: '충청북도 괴산군 괴산읍 임꺽정로 90', wideArea: '충청북도', region: '괴산군' },

  // 대전광역시 (5곳)
  { address: '대전광역시 유성구 대학로 99', wideArea: '대전광역시', region: '유성구' },
  { address: '대전광역시 서구 둔산로 100', wideArea: '대전광역시', region: '서구' },
  { address: '대전광역시 중구 중앙로 101', wideArea: '대전광역시', region: '중구' },
  { address: '대전광역시 동구 동대전로 133', wideArea: '대전광역시', region: '동구' },
  { address: '대전광역시 대덕구 대전로1033번길 20', wideArea: '대전광역시', region: '대덕구' },

  // 전북특별자치도 (6곳)
  {
    address: '전북특별자치도 전주시 완산구 효자로 225',
    wideArea: '전북특별자치도',
    region: '전주시 완산구',
  },
  {
    address: '전북특별자치도 전주시 덕진구 건산로 251',
    wideArea: '전북특별자치도',
    region: '전주시 덕진구',
  },
  { address: '전북특별자치도 군산시 시청로 17', wideArea: '전북특별자치도', region: '군산시' },
  { address: '전북특별자치도 익산시 인북로 140', wideArea: '전북특별자치도', region: '익산시' },
  { address: '전북특별자치도 정읍시 충정로 379', wideArea: '전북특별자치도', region: '정읍시' },
  { address: '전북특별자치도 남원시 시청로 60', wideArea: '전북특별자치도', region: '남원시' },

  // 전라남도 (6곳)
  { address: '전라남도 여수시 시청로 1', wideArea: '전라남도', region: '여수시' },
  { address: '전라남도 목포시 평화로 29', wideArea: '전라남도', region: '목포시' },
  { address: '전라남도 순천시 장명로 30', wideArea: '전라남도', region: '순천시' },
  { address: '전라남도 나주시 빛가람로 601', wideArea: '전라남도', region: '나주시' },
  { address: '전라남도 광양시 시청로 33', wideArea: '전라남도', region: '광양시' },
  { address: '전라남도 담양군 담양읍 추성로 1371', wideArea: '전라남도', region: '담양군' },

  // 광주광역시 (3곳)
  { address: '광주광역시 서구 내방로 111', wideArea: '광주광역시', region: '서구' },
  { address: '광주광역시 북구 용봉로 77', wideArea: '광주광역시', region: '북구' },
  { address: '광주광역시 동구 서남로 1', wideArea: '광주광역시', region: '동구' },

  // 경상북도 (6곳)
  { address: '경상북도 포항시 남구 시청로 1', wideArea: '경상북도', region: '포항시 남구' },
  { address: '경상북도 경주시 양정로 260', wideArea: '경상북도', region: '경주시' },
  { address: '경상북도 김천시 시청로 20', wideArea: '경상북도', region: '김천시' },
  { address: '경상북도 안동시 퇴계로 115', wideArea: '경상북도', region: '안동시' },
  { address: '경상북도 구미시 송정대로 55', wideArea: '경상북도', region: '구미시' },
  { address: '경상북도 영주시 시청로 1', wideArea: '경상북도', region: '영주시' },

  // 경상남도 (5곳)
  { address: '경상남도 창원시 성산구 중앙대로 151', wideArea: '경상남도', region: '창원시 성산구' },
  { address: '경상남도 진주시 동진로 155', wideArea: '경상남도', region: '진주시' },
  { address: '경상남도 김해시 김해대로 2401', wideArea: '경상남도', region: '김해시' },
  { address: '경상남도 거제시 계룡로 125', wideArea: '경상남도', region: '거제시' },
  { address: '경상남도 양산시 중앙로 39', wideArea: '경상남도', region: '양산시' },

  // 대구광역시 (3곳)
  { address: '대구광역시 중구 공평로 88', wideArea: '대구광역시', region: '중구' },
  { address: '대구광역시 수성구 동대구로 364', wideArea: '대구광역시', region: '수성구' },
  { address: '대구광역시 달서구 학산로 30', wideArea: '대구광역시', region: '달서구' },

  // 부산광역시 (4곳)
  { address: '부산광역시 해운대구 센텀중앙로 79', wideArea: '부산광역시', region: '해운대구' },
  { address: '부산광역시 부산진구 시민공원로 30', wideArea: '부산광역시', region: '부산진구' },
  { address: '부산광역시 사하구 낙동대로 398번길 12', wideArea: '부산광역시', region: '사하구' },
  { address: '부산광역시 금정구 금정로 45', wideArea: '부산광역시', region: '금정구' },

  // 울산광역시 (3곳)
  { address: '울산광역시 남구 삼산로 257', wideArea: '울산광역시', region: '남구' },
  { address: '울산광역시 중구 북부순환도로 375', wideArea: '울산광역시', region: '중구' },
  { address: '울산광역시 울주군 청량읍 군청로 1', wideArea: '울산광역시', region: '울주군' },

  // 세종특별자치시 (2곳)
  { address: '세종특별자치시 한누리대로 2130', wideArea: '세종특별자치시', region: '어진동' },
  { address: '세종특별자치시 갈매로 477', wideArea: '세종특별자치시', region: '조치원읍' },

  // 제주특별자치도 (1곳)
  { address: '제주특별자치도 제주시 문연로 6', wideArea: '제주특별자치도', region: '제주시' },
];

// 군구분 비율: 육군 60%, 해군/공군/해병/국직 각 10%
const MILITARY_TYPES: { type: MilitaryType; weight: number }[] = [
  { type: 'Army', weight: 60 },
  { type: 'Navy', weight: 10 },
  { type: 'AirForce', weight: 10 },
  { type: 'Marines', weight: 10 },
  { type: 'MND', weight: 10 },
];

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
];
const FIRST_NAMES = [
  '민준',
  '서준',
  '도윤',
  '예준',
  '시우',
  '하준',
  '지호',
  '주원',
  '현우',
  '도현',
  '지훈',
  '건우',
  '우진',
  '성민',
  '재원',
  '태현',
];
const PLACES = [
  '대강당',
  '연병장',
  '체육관',
  '교육관',
  '회의실',
  '다목적실',
  '세미나실',
  '훈련장',
  '교육센터',
  '강의실',
];

// 유틸리티 함수
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMilitaryType(): MilitaryType {
  const rand = randomInt(1, 100);
  let cumulative = 0;
  for (const { type, weight } of MILITARY_TYPES) {
    cumulative += weight;
    if (rand <= cumulative) return type;
  }
  return 'Army';
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Kakao Local API를 사용해서 주소를 위도/경도로 변환
// 1차: 주소 검색 API, 2차: 키워드 검색 API (fallback)
async function getCoordinatesFromAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    console.warn('⚠️ KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    return null;
  }

  try {
    // 1차: 주소 검색 API
    const addressResponse = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
      params: { query: address },
    });

    if (addressResponse.data.documents && addressResponse.data.documents.length > 0) {
      const { x, y } = addressResponse.data.documents[0];
      return { lat: parseFloat(y), lng: parseFloat(x) };
    }

    // 2차: 키워드 검색 API (fallback)
    const keywordResponse = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
      params: { query: address },
    });

    if (keywordResponse.data.documents && keywordResponse.data.documents.length > 0) {
      const { x, y } = keywordResponse.data.documents[0];
      return { lat: parseFloat(y), lng: parseFloat(x) };
    }

    console.warn(`⚠️ 좌표를 찾을 수 없음: ${address}`);
    return null;
  } catch (error) {
    console.error(`❌ Kakao API 호출 실패 (${address}):`, error);
    return null;
  }
}

// 주소 목록을 좌표로 변환
async function convertAddressesToCoordinates() {
  console.log('🗺️ Kakao API로 주소를 좌표로 변환 중...');
  const locations: Array<{
    address: string;
    wideArea: string;
    region: string;
    lat: number;
    lng: number;
  }> = [];

  for (const addr of REAL_ADDRESSES) {
    const coords = await getCoordinatesFromAddress(addr.address);
    if (coords) {
      locations.push({ ...addr, ...coords });
    } else {
      console.warn(`  ⚠️ ${addr.address} - 좌표 변환 실패, 건너뜀`);
    }
    // API 호출 제한을 피하기 위한 딜레이
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`  ✅ 총 ${locations.length}개 주소 변환 완료\n`);
  return locations;
}

// 부대명 생성 (중복 방지를 위한 카운터 기반)
const usedNames = new Set<string>();
function generateUniqueUnitName(index: number): string {
  const suffixes = ['사단', '여단', '연대', '대대', '부대', '사령부', '지원단', '교육대'];
  const prefixes = [
    '육군',
    '해군',
    '공군',
    '해병',
    '수도방위',
    '특전',
    '기계화',
    '포병',
    '공병',
    '통신',
    '군수',
    '의무',
  ];

  let name = '';
  let attempts = 0;
  while (attempts < 100) {
    const num = Math.floor(index / 8) + 1 + attempts * 10;
    const suffix = suffixes[index % suffixes.length];
    const prefix = prefixes[Math.floor(index / 10) % prefixes.length];
    name = `${prefix}${num}${suffix}(2026)`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback with UUID-like suffix
  name = `부대2026-${index}-${Date.now() % 10000}`;
  usedNames.add(name);
  return name;
}

interface UnitConfig {
  month: number; // 0 = January, 1 = February
  hasMultipleLocations: boolean;
  hasExcludedDates: boolean;
  hasAdditionalTraining: boolean;
  locationIndex: number;
}

async function createUnit(
  index: number,
  config: UnitConfig,
  location: { address: string; wideArea: string; region: string; lat: number; lng: number },
) {
  const { month, hasMultipleLocations, hasExcludedDates, hasAdditionalTraining, locationIndex } = config;

  const unitName = generateUniqueUnitName(index);
  const militaryType = getMilitaryType();

  // 부대 생성
  const unit = await prisma.unit.create({
    data: {
      lectureYear: 2026,
      name: unitName,
      unitType: militaryType,
      wideArea: location.wideArea,
      region: location.region,
      addressDetail: location.address,
      detailAddress: `본관 ${randomInt(1, 5)}층`,
      lat: location.lat,
      lng: location.lng,
    },
  });

  // 공통 시디팅 로직
  const seedPeriod = async (name: string, startDate: Date, hasExcluded: boolean) => {
    // 불가일자 생성 (교육 기간 중 2번째 날짜를 불가일자로 설정)
    let excludedDates: string[] = [];
    const calendarDays = hasExcluded ? 4 : 3;
    if (hasExcluded) {
      const excludedDate = new Date(startDate);
      excludedDate.setUTCDate(startDate.getUTCDate() + 1);
      excludedDates = [formatDate(excludedDate)];
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + calendarDays - 1);

    const trainingPeriod = await prisma.trainingPeriod.create({
      data: {
        unitId: unit.id,
        name,
        workStartTime: new Date('1970-01-01T09:00:00Z'),
        workEndTime: new Date('1970-01-01T18:00:00Z'),
        lunchStartTime: new Date('1970-01-01T12:00:00Z'),
        lunchEndTime: new Date('1970-01-01T13:00:00Z'),
        officerName: `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`,
        officerPhone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        officerEmail: `officer${index}@army.mil.kr`,
        isStaffLocked: false,
        excludedDates,
        hasCateredMeals: Math.random() > 0.3,
        hasHallLodging: Math.random() > 0.4,
        allowsPhoneBeforeAfter: true,
      },
    });

    const locCount = hasMultipleLocations ? randomInt(2, 3) : 1;
    const locIds: number[] = [];
    const NOTES = ['주차 가능', '프로젝터 있음', '음향시설 완비', '에어컨 가동', ''];
    for (let l = 0; l < locCount; l++) {
      const tl = await prisma.trainingLocation.create({
        data: {
          trainingPeriodId: trainingPeriod.id,
          originalPlace: l === 0 ? randomChoice(PLACES) : `추가장소${l + 1}`,
          hasInstructorLounge: true,
          hasWomenRestroom: true,
          note: l === 0 ? randomChoice(NOTES) : null, // 첫 번째 장소에만 랜덤 특이사항
        },
      });
      locIds.push(tl.id);
    }

    const excludedSet = new Set(excludedDates);
    const curr = new Date(startDate);
    let sCount = 0;
    while (curr <= endDate) {
      const ds = formatDate(curr);
      if (!excludedSet.has(ds)) {
        const schedule = await prisma.unitSchedule.create({
          data: { trainingPeriodId: trainingPeriod.id, date: new Date(curr) },
        });
        for (const locId of locIds) {
          const pc = randomInt(50, 150);
          await prisma.scheduleLocation.create({
            data: {
              unitScheduleId: schedule.id,
              trainingLocationId: locId,
              plannedCount: pc,
              actualCount: Math.floor(pc * (0.8 + Math.random() * 0.2)),
            },
          });
        }
        sCount++;
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return { sCount, locCount };
  };

  // 1. 정규 교육
  const mondays = [5, 12, 19, 26];
  const monday = randomChoice(mondays);
  const startDayOffset = hasExcludedDates ? randomInt(0, 1) : randomInt(0, 2);
  const regularStart = new Date(Date.UTC(2026, month, monday + startDayOffset));
  const regularResult = await seedPeriod('정규교육', regularStart, hasExcludedDates);

  // 2. 추가 교육 (10%)
  let additionalResult = { sCount: 0, locCount: 0 };
  if (hasAdditionalTraining) {
    // 정규 교육 2주 후 (간단하게 14일 뒤)
    const additionalStart = new Date(regularStart);
    additionalStart.setUTCDate(regularStart.getUTCDate() + 14);
    // 추가 교육은 불가일자 없음으로 단순화 (3일 고정)
    additionalResult = await seedPeriod('추가교육', additionalStart, false);
  }

  // 거리 테이블 생성
  try {
    await distanceService.createDistanceRowsForNewUnit(unit.id);
  } catch (e) {
    console.warn(`  ⚠️ 거리 테이블 생성 실패 (부대 ID: ${unit.id})`);
  }

  return {
    unitId: unit.id,
    scheduleCount: regularResult.sCount + additionalResult.sCount,
    locationCount: regularResult.locCount, // 부대 기준 장소 수는 정규교육 기준
  };
}

export async function runSeedUnits() {
  console.log('🏢 부대 100개 생성 시작 (2026년 1~2월)...\n');

  const locations = await convertAddressesToCoordinates();

  // 설정 분배
  // 1월 60개, 2월 40개
  const configs: UnitConfig[] = [];
  for (let i = 0; i < 100; i++) {
    configs.push({
      month: i < 60 ? 0 : 1,
      hasMultipleLocations: false,
      hasExcludedDates: i < 25, // 25% 불가일자
      hasAdditionalTraining: false,
      locationIndex: i % locations.length,
    });
  }

  // 정확히 20% 복수 장소 (20개)
  for (let i = 0; i < 20; i++) configs[i].hasMultipleLocations = true;
  // 정확히 10% 추가 교육 (10개)
  for (let i = 20; i < 30; i++) configs[i].hasAdditionalTraining = true;

  // 셔플
  configs.sort(() => Math.random() - 0.5);

  let createdCount = 0;
  let totalSchedules = 0;
  let totalLocations = 0;

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const location = locations[config.locationIndex];

    try {
      const result = await createUnit(i, config, location);
      createdCount++;
      totalSchedules += result.scheduleCount;
      totalLocations += result.locationCount;

      if (createdCount % 20 === 0) {
        console.log(`  ✅ ${createdCount}/100 완료...`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 부대 ${i} 생성 실패:`, message);
    }
  }

  console.log(`  ✅ 부대 ${createdCount}개 생성 완료\n`);

  // 통계
  const extraCount = await prisma.trainingPeriod.count({ where: { name: '추가교육' } });
  const multiLocCount = await prisma.unit.count({
    where: { trainingPeriods: { some: { locations: { some: { originalPlace: '추가장소2' } } } } },
  });

  console.log('='.repeat(50));
  console.log('📊 부대 생성 결과');
  console.log('='.repeat(50));
  console.log(`총 부대: ${createdCount}개`);
  console.log(`추가 교육 부대: ${extraCount}개 (목표: 10개)`);
  console.log(`복수 장소 부대: ${multiLocCount}개 (목표: 약 20개)`);
  console.log('='.repeat(50));

  // Excel 테스트 파일 생성
  console.log('\n📄 Excel 테스트 파일 생성 중...');
  await generateExcelTestFile();
}

// 생성된 부대 데이터를 Excel 파일로 내보내기 (업로드 테스트용)
async function generateExcelTestFile() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'T-Lecture Seed';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('부대 업로드 테스트');

  // 메타데이터 행
  sheet.getCell('A1').value = '강의년도';
  sheet.getCell('B1').value = 2026;

  // 헤더 정의 (6행)
  const headers = [
    '부대명', '군구분', '광역', '지역', '부대주소', '부대상세주소',
    '교육시작일자', '교육종료일자', '교육불가일자',
    '근무시작시간', '근무종료시간', '점심시작시간', '점심종료시간',
    '간부명', '간부 전화번호', '간부 이메일 주소',
    '수탁급식여부', '회관숙박여부', '사전사후 휴대폰 불출 여부',
    '기존교육장소', '변경교육장소', '강사휴게실 여부', '여자화장실 여부',
    '계획인원', '참여인원', '특이사항'
  ];
  const headerRow = sheet.getRow(6);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
    headerRow.getCell(i + 1).font = { bold: true };
  });

  // DB에서 최근 생성된 부대 50개 조회 (테스트 파일용)
  const units = await prisma.unit.findMany({
    take: 50,
    orderBy: { id: 'desc' },
    include: {
      trainingPeriods: {
        include: {
          locations: true,
          schedules: {
            include: { scheduleLocations: true },
            take: 1, // 첫 번째 일정만
          },
        },
      },
    },
  });

  let rowNum = 7;
  for (const unit of units) {
    const period = unit.trainingPeriods[0];
    if (!period) continue;

    // 일정에서 시작/종료 날짜 계산
    const schedules = await prisma.unitSchedule.findMany({
      where: { trainingPeriodId: period.id },
      orderBy: { date: 'asc' },
    });
    const startDate = schedules[0]?.date?.toISOString().split('T')[0] || '';
    const endDate = schedules[schedules.length - 1]?.date?.toISOString().split('T')[0] || '';

    // 각 장소별로 행 생성
    for (let locIdx = 0; locIdx < period.locations.length; locIdx++) {
      const loc = period.locations[locIdx];
      const schedLoc = period.schedules[0]?.scheduleLocations.find(
        (sl) => sl.trainingLocationId === loc.id
      );

      const row = sheet.getRow(rowNum);
      row.getCell(1).value = locIdx === 0 ? unit.name : ''; // 부대명은 첫 번째 장소만
      row.getCell(2).value = locIdx === 0 ? (unit.unitType || '') : '';
      row.getCell(3).value = locIdx === 0 ? (unit.wideArea || '') : '';
      row.getCell(4).value = locIdx === 0 ? (unit.region || '') : '';
      row.getCell(5).value = locIdx === 0 ? (unit.addressDetail || '') : '';
      row.getCell(6).value = locIdx === 0 ? (unit.detailAddress || '') : '';
      row.getCell(7).value = locIdx === 0 ? startDate : '';
      row.getCell(8).value = locIdx === 0 ? endDate : '';
      row.getCell(9).value = locIdx === 0 ? (period.excludedDates || []).join(',') : '';
      row.getCell(10).value = locIdx === 0 ? '09:00' : '';
      row.getCell(11).value = locIdx === 0 ? '18:00' : '';
      row.getCell(12).value = locIdx === 0 ? '12:00' : '';
      row.getCell(13).value = locIdx === 0 ? '13:00' : '';
      row.getCell(14).value = locIdx === 0 ? (period.officerName || '') : '';
      row.getCell(15).value = locIdx === 0 ? (period.officerPhone || '') : '';
      row.getCell(16).value = locIdx === 0 ? (period.officerEmail || '') : '';
      row.getCell(17).value = locIdx === 0 ? (period.hasCateredMeals ? 'O' : 'X') : '';
      row.getCell(18).value = locIdx === 0 ? (period.hasHallLodging ? 'O' : 'X') : '';
      row.getCell(19).value = locIdx === 0 ? (period.allowsPhoneBeforeAfter ? 'O' : 'X') : '';
      row.getCell(20).value = loc.originalPlace || '';
      row.getCell(21).value = loc.changedPlace || '';
      row.getCell(22).value = loc.hasInstructorLounge ? 'O' : 'X';
      row.getCell(23).value = loc.hasWomenRestroom ? 'O' : 'X';
      row.getCell(24).value = schedLoc?.plannedCount || '';
      row.getCell(25).value = schedLoc?.actualCount || '';
      row.getCell(26).value = loc.note || '';

      rowNum++;
    }
  }

  // 파일 저장 (프로젝트 루트)
  const filePath = '../seeded_units_2026.xlsx';
  await workbook.xlsx.writeFile(filePath);
  console.log(`  ✅ Excel 테스트 파일 생성 완료: ${filePath}`);
  console.log(`  📌 이 파일을 부대 관리에서 업로드하여 테스트할 수 있습니다.`);
}

// 직접 실행 시
if (require.main === module) {
  runSeedUnits()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
