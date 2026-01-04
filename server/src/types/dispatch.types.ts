// server/src/types/dispatch.types.ts
// Dispatch 도메인 중앙화된 타입 정의

export interface NoticeData {
  title: string;
  body: string;
}

export interface DispatchCreateData {
  type: 'Temporary' | 'Confirmed';
  title?: string;
  body: string;
  userId: number;
  assignmentIds?: number[];
}

// 강사 목록 포맷용 타입
export interface InstructorForFormat {
  name?: string | null;
  phone?: string | null;
  category?: string | null;
  isTeamLeader?: boolean;
  virtues?: Array<{ virtue?: { name?: string | null } }>;
}

// 스케줄 포맷용 타입
export interface ScheduleForFormat {
  date: Date | null;
  assignments?: Array<{
    state?: string;
    User?: {
      id: number;
      name?: string | null;
      userphoneNumber?: string | null;
      instructor?: {
        category?: string | null;
        isTeamLeader?: boolean;
        virtues?: Array<{ virtue?: { name?: string | null } }>;
      } | null;
    };
  }>;
}
