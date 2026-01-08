// features/settings/ui/template-editor/sample.ts
// 미리보기용 샘플 데이터 렌더링

import type { Token } from './types';

/**
 * 일반 변수용 샘플 데이터
 */
const SAMPLE_DATA: Record<string, string> = {
  // === 부대 정보 (Unit) ===
  'unit.name': '제12사단',
  'unit.unitType': '육군',
  'unit.wideArea': '강원도',
  'unit.region': '인제군',
  'unit.addressDetail': '인제읍 이평로 255',
  'unit.detailAddress': '3층 대강당',

  // === 교육기간 정보 (TrainingPeriod) ===
  'period.name': '정규교육',
  'period.startDate': '2024-11-17',
  'period.endDate': '2024-11-19',
  'period.startTime': '09:00',
  'period.endTime': '16:00',
  'period.lunchStartTime': '12:00',
  'period.lunchEndTime': '13:00',
  'period.officerName': '대위 이용준',
  'period.officerPhone': '010-6640-9433',
  'period.officerEmail': 'lee.yongjun@army.mil.kr',
  'period.excludedDates': '2024-11-18 / 2024-11-20',
  'period.hasCateredMeals': 'X',
  'period.hasHallLodging': 'O',
  'period.allowsPhoneBeforeAfter': '가능',

  // === 본인 정보 ===
  'self.name': '홍길동',
  'self.phone': '010-1234-5678',
  'self.category': '부강사',
  'self.position': '책임강사',
  'self.virtues': '협력, 정의',

  // === 하위 호환용 (기존 unit.* 변수) ===
  'unit.officerName': '대위 이용준',
  'unit.officerPhone': '010-6640-9433',
  'unit.startDate': '2024-11-17',
  'unit.endDate': '2024-11-19',
  'unit.startTime': '09:00',
  'unit.endTime': '16:00',
  'unit.excludedDates': '2024-11-18 / 2024-11-20',

  // === 하위 호환용 (기존 location.* 변수) ===
  'location.originalPlace': '교육관',
  'location.changedPlace': '체육관',
  'location.hasInstructorLounge': 'O',
  'location.hasWomenRestroom': 'O',
  'location.hasCateredMeals': 'X',
  'location.hasHallLodging': 'O',
  'location.allowsPhoneBeforeAfter': '가능',
  'location.plannedCount': '75',
  'location.actualCount': '75',
  'location.note': 'TV, 마이크 있음',
};

/**
 * 포맷 변수용 샘플 데이터
 */
function renderFormatSample(key: string, format: string): string {
  // self.schedules - 날짜별 강사 목록
  if (key === 'self.schedules') {
    const schedules = [
      {
        name: '홍길동',
        date: '2024-11-17',
        dayOfWeek: '일',
        instructors: '김민지(주), 홍길동(부), 김철수(보조)',
      },
      {
        name: '홍길동',
        date: '2024-11-18',
        dayOfWeek: '월',
        instructors: '김민지(주), 홍길동(부)',
      },
      {
        name: '홍길동',
        date: '2024-11-19',
        dayOfWeek: '화',
        instructors: '홍길동(부), 김철수(보조)',
      },
    ];
    return schedules
      .map((s) => {
        let line = format;
        Object.entries(s).forEach(([k, v]) => {
          line = line.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
        return line;
      })
      .join('\n');
  }

  // self.mySchedules - 날짜별 본인 일정
  if (key === 'self.mySchedules') {
    const schedules = [
      {
        date: '2024-11-17',
        dayOfWeek: '일',
        name: '홍길동',
      },
      {
        date: '2024-11-18',
        dayOfWeek: '월',
        name: '홍길동',
      },
      {
        date: '2024-11-19',
        dayOfWeek: '화',
        name: '홍길동',
      },
    ];
    return schedules
      .map((s) => {
        let line = format;
        Object.entries(s).forEach(([k, v]) => {
          line = line.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
        return line;
      })
      .join('\n');
  }

  // scheduleLocations - 날짜별 장소 세부정보
  if (key === 'scheduleLocations') {
    const scheduleLocations = [
      {
        date: '2024-11-17',
        dayOfWeek: '일',
        placeName: '교육관',
        actualCount: '75',
        hasInstructorLounge: 'O',
        hasWomenRestroom: 'O',
        note: 'TV 있음',
      },
      {
        date: '2024-11-17',
        dayOfWeek: '일',
        placeName: '체육관',
        actualCount: '48',
        hasInstructorLounge: 'X',
        hasWomenRestroom: 'O',
        note: '',
      },
      {
        date: '2024-11-18',
        dayOfWeek: '월',
        placeName: '교육관',
        actualCount: '80',
        hasInstructorLounge: 'O',
        hasWomenRestroom: 'O',
        note: '',
      },
      {
        date: '2024-11-19',
        dayOfWeek: '화',
        placeName: '교육관',
        actualCount: '70',
        hasInstructorLounge: 'O',
        hasWomenRestroom: 'O',
        note: 'TV 있음',
      },
    ];
    // 날짜별로 그룹핑하여 "[날짜 (요일)]" 헤더 + 들여쓰기 형태로 표시
    const grouped = new Map<string, typeof scheduleLocations>();
    for (const item of scheduleLocations) {
      const key = `${item.date} (${item.dayOfWeek})`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    const lines: string[] = [];
    for (const [dateKey, locations] of grouped) {
      lines.push(`[${dateKey}]`);
      for (const sl of locations) {
        let line = format;
        Object.entries(sl).forEach(([k, v]) => {
          line = line.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
        lines.push(`  ${line}`);
      }
    }
    return lines.join('\n');
  }

  // instructors - 강사 목록 (세로)
  if (key === 'instructors') {
    const instructors = [
      { index: '1', name: '김민지', phone: '010-6254-1209', category: '주', virtues: '협력, 정의' },
      {
        index: '2',
        name: '홍길동',
        phone: '010-1234-5678',
        category: '부',
        virtues: '리더십, 소통',
      },
    ];
    return instructors
      .map((inst) => {
        let line = format;
        Object.entries(inst).forEach(([k, v]) => {
          line = line.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
        return line;
      })
      .join('\n');
  }

  // 알 수 없는 포맷 변수
  return `[${key} 포맷]`;
}

/**
 * 토큰 배열을 미리보기용 문자열로 변환
 */
export function renderPreview(tokens: Token[]): string {
  let result = '';

  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        result += t.text;
        break;
      case 'newline':
        result += '\n';
        break;
      case 'var':
        result += SAMPLE_DATA[t.key] ?? `[${t.key}]`;
        break;
      case 'format':
        result += renderFormatSample(t.key, t.format);
        break;
    }
  }

  return result;
}

/**
 * 템플릿 문자열을 미리보기로 변환 (편의 함수)
 */
export function renderPreviewFromTemplate(template: string): string {
  // 동적 import 피하기 위해 간단한 파싱 재구현
  const tokens: Token[] = [];
  const re = /\{\{([\s\S]*?)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(template)) !== null) {
    if (m.index > last) {
      const chunk = template.slice(last, m.index);
      const parts = chunk.split('\n');
      parts.forEach((part, i) => {
        if (part) tokens.push({ type: 'text', text: part });
        if (i < parts.length - 1) tokens.push({ type: 'newline' });
      });
    }

    const raw = m[1] ?? '';
    const idx = raw.indexOf(':format=');
    if (idx === -1) {
      tokens.push({ type: 'var', key: raw.trim() });
    } else {
      tokens.push({
        type: 'format',
        key: raw.slice(0, idx).trim(),
        format: raw.slice(idx + ':format='.length),
      });
    }
    last = re.lastIndex;
  }

  if (last < template.length) {
    const chunk = template.slice(last);
    const parts = chunk.split('\n');
    parts.forEach((part, i) => {
      if (part) tokens.push({ type: 'text', text: part });
      if (i < parts.length - 1) tokens.push({ type: 'newline' });
    });
  }

  return renderPreview(tokens);
}
