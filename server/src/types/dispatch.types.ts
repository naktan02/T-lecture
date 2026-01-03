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
  assignmentIds: number[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AssignmentTarget = any;

export interface UserDispatchGroup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  assignments: AssignmentTarget[];
}
