// server/src/types/distance.types.ts
// Distance 도메인 중앙화된 타입 정의

export interface InstructorWithCoords {
  userId: number;
  lat: number | null;
  lng: number | null;
  location: string | null;
}

export interface UnitWithCoords {
  id: number;
  lat: number | null;
  lng: number | null;
  addressDetail: string | null;
}

export interface DistanceData {
  distance: number;
  duration: number;
}

export interface ProcessResult {
  instructorId: number;
  unitId: number;
  scheduleDate: Date | null;
  distance?: number;
  status: 'success' | 'error';
  error?: string;
  code?: string;
  statusCode?: number;
  prismaCode?: string | null;
}
