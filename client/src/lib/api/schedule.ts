// client/src/lib/api/schedule.ts

// 타입 정의
export interface ScheduleResponse {
  message: string;
}

export interface AvailabilityDate {
  date: string;
  isAvailable: boolean;
}

/*const BASE_URL = '/api/v1/schedules'; // 우리가 만든 백엔드 주소

// 1. 스케줄 등록 (POST)
export const postAvailability = async (dates: string[]): Promise<ScheduleResponse> => {
  // dates: ['2025-05-01', '2025-05-02']
  const response = await fetch(`${BASE_URL}/availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 나중에는 여기에 'Authorization': `Bearer ${token}` 추가해야 함
    },
    body: JSON.stringify({ dates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '스케줄 등록 실패');
  }

  return response.json();
};

// 2. 내 스케줄 조회 (GET) - 나중에 필요할 때 쓰세요
export const getMyAvailability = async (): Promise<AvailabilityDate[]> => {
  const response = await fetch(`${BASE_URL}/availability`);
  if (!response.ok) throw new Error('스케줄 조회 실패');
  return response.json();
}; 
*/

import { logger } from '../../shared/utils';

// [테스트용 가짜 API] 백엔드 없이 화면만 볼 때 사용하세요.
export const postAvailability = async (dates: string[]): Promise<ScheduleResponse> => {
  logger.debug('전송된 날짜들(가짜):', dates);

  // 0.5초 기다렸다가 성공했다고 뻥치기
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ message: '가짜 성공! 백엔드 없이 잘 되네요.' });
    }, 500);
  });
};

export const getMyAvailability = async (): Promise<AvailabilityDate[]> => {
  return [];
};
