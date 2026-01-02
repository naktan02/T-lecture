// server/src/types/message.types.ts
// Message 도메인 중앙화된 타입 정의

export interface NoticeData {
  title: string;
  body: string;
}

export interface MessageCreateData {
  type: 'Temporary' | 'Confirmed';
  title?: string;
  body: string;
  userId: number;
  assignmentIds: number[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AssignmentTarget = any;

export interface UserMessageGroup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  assignments: AssignmentTarget[];
}
