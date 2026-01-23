// server/src/domains/metadata/metadata.service.ts
import metadataRepository from './metadata.repository';
import AppError from '../../common/errors/AppError';
import type { MessageTemplateBody, FormatPresets } from '../../types/template.types';

// 공통 유틸: 숫자 ID 파싱/검증
const parseIntIdOrThrow = (raw: string | number, fieldName = 'id'): number => {
  const n = Number(raw);
  if (!raw || Number.isNaN(n) || !Number.isInteger(n) || n <= 0) {
    throw new AppError(`유효하지 않은 ${fieldName} 입니다.`, 400, 'VALIDATION_ERROR', {
      [fieldName]: raw,
    });
  }
  return n;
};

// 공통 유틸: 문자열 검증
const requireNonEmptyString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} 값이 필요합니다.`, 400, 'VALIDATION_ERROR', {
      [fieldName]: value,
    });
  }
  return value.trim();
};

class MetadataService {
  // 강사 가입용 메타데이터 (통합)
  async getInstructorMeta() {
    const [virtues, teams, categories] = await Promise.all([
      metadataRepository.findVirtues(),
      metadataRepository.findTeams(),
      metadataRepository.findCategories(),
    ]);

    return { virtues, teams, categories };
  }

  // 팀 목록 조회 (삭제되지 않은 팀만)
  async getAllTeams() {
    return metadataRepository.findTeams();
  }

  // 덕목 목록 조회
  async getAllVirtues() {
    return metadataRepository.findVirtues();
  }

  // 템플릿 목록 조회
  async getMessageTemplates() {
    return metadataRepository.findMessageTemplates();
  }

  // 팀 생성
  async createTeam(name: string) {
    const teamName = requireNonEmptyString(name, 'name');
    return metadataRepository.createTeam(teamName);
  }

  // 팀 수정
  async updateTeam(id: string | number, name: string) {
    const teamId = parseIntIdOrThrow(id, 'teamId');
    const teamName = requireNonEmptyString(name, 'name');
    return metadataRepository.updateTeam(teamId, teamName);
  }

  // 팀 삭제 (Soft Delete)
  async deleteTeam(id: string | number) {
    const teamId = parseIntIdOrThrow(id, 'teamId');
    return metadataRepository.softDeleteTeam(teamId);
  }

  // 덕목 생성
  async createVirtue(name: string) {
    const virtueName = requireNonEmptyString(name, 'name');
    return metadataRepository.createVirtue(virtueName);
  }

  // 덕목 수정
  async updateVirtue(id: string | number, name: string) {
    const virtueId = parseIntIdOrThrow(id, 'virtueId');
    const virtueName = requireNonEmptyString(name, 'name');

    return metadataRepository.updateVirtue(virtueId, virtueName);
  }

  // 덕목 삭제 (Hard Delete - CASCADE로 연결된 강사-덕목도 삭제)
  async deleteVirtue(id: string | number) {
    const virtueId = parseIntIdOrThrow(id, 'virtueId');
    return metadataRepository.deleteVirtue(virtueId);
  }

  // 템플릿 수정 (body와 formatPresets는 JSONB)
  async updateMessageTemplate(
    key: string,
    title: string,
    body: MessageTemplateBody,
    formatPresets?: FormatPresets | null,
  ) {
    const templateKey = requireNonEmptyString(key, 'key');
    const t = requireNonEmptyString(title, 'title');

    if (!body || !Array.isArray(body.tokens)) {
      throw new AppError('body.tokens 배열이 필요합니다.', 400, 'VALIDATION_ERROR');
    }

    return metadataRepository.updateMessageTemplate(templateKey, t, body, formatPresets);
  }

  // ===== SystemConfig (배정 설정) =====

  // 배정 설정 키 목록
  private readonly ASSIGNMENT_CONFIG_KEYS = [
    'TRAINEES_PER_INSTRUCTOR',
    'REJECTION_PENALTY_DAYS',
    'INTERN_MAX_DISTANCE_KM',
    'SUB_MAX_DISTANCE_KM',
  ];

  // 배정 설정 기본값
  private readonly ASSIGNMENT_CONFIG_DEFAULTS: Record<
    string,
    { value: string; description: string }
  > = {
    TRAINEES_PER_INSTRUCTOR: { value: '36', description: '강사당 교육생 수' },
    REJECTION_PENALTY_DAYS: { value: '15', description: '거절 패널티 기간 (일)' },
    INTERN_MAX_DISTANCE_KM: { value: '50', description: '실습강사 제한 거리 (km)' },
    SUB_MAX_DISTANCE_KM: { value: '0', description: '보조강사 제한 거리 (km), 0=제한없음' },
  };

  // 배정 설정 조회
  async getAssignmentConfigs() {
    const configs = await metadataRepository.findSystemConfigs(this.ASSIGNMENT_CONFIG_KEYS);

    // 기본값과 병합
    return this.ASSIGNMENT_CONFIG_KEYS.map((key) => {
      const existing = configs.find((c) => c.key === key);
      const defaults = this.ASSIGNMENT_CONFIG_DEFAULTS[key];
      return {
        key,
        value: existing?.value ?? defaults.value,
        description: existing?.description ?? defaults.description,
      };
    });
  }

  // 배정 설정 수정
  async updateAssignmentConfig(key: string, value: string) {
    if (!this.ASSIGNMENT_CONFIG_KEYS.includes(key)) {
      throw new AppError(`허용되지 않은 설정 키입니다: ${key}`, 400, 'VALIDATION_ERROR');
    }

    const numValue = Number(value);
    // SUB_MAX_DISTANCE_KM은 0 허용 (0 = 제한없음)
    if (key === 'SUB_MAX_DISTANCE_KM') {
      if (!Number.isFinite(numValue) || numValue < 0 || !Number.isInteger(numValue)) {
        throw new AppError('설정 값은 0 이상의 정수여야 합니다.', 400, 'VALIDATION_ERROR');
      }
    } else {
      if (!Number.isFinite(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
        throw new AppError('설정 값은 양의 정수여야 합니다.', 400, 'VALIDATION_ERROR');
      }
    }

    const defaults = this.ASSIGNMENT_CONFIG_DEFAULTS[key];
    return metadataRepository.upsertSystemConfig(key, value, defaults.description);
  }

  // ===== InstructorPenalty (패널티 관리) =====

  // 패널티 목록 조회 (만료되지 않은 것만)
  async getPenalties() {
    return metadataRepository.findActivePenalties();
  }

  // 모든 패널티 조회 (만료 포함)
  async getAllPenalties() {
    return metadataRepository.findAllPenalties();
  }

  // 패널티 추가 (또는 기간 연장)
  async addPenalty(userId: number, days: number) {
    return metadataRepository.addPenalty(userId, days);
  }

  // 패널티 만료일 수정
  async updatePenaltyExpiration(userId: number, expiresAt: Date) {
    return metadataRepository.updatePenaltyExpiration(userId, expiresAt);
  }

  // 패널티 삭제
  async deletePenalty(userId: number) {
    return metadataRepository.deletePenalty(userId);
  }

  // 패널티 기간 차감 (관리자 재추가 시)
  async reducePenalty(userId: number, days: number) {
    return metadataRepository.reducePenalty(userId, days);
  }

  // ===== InstructorPriorityCredit (우선배정 관리) =====

  // 우선배정 크레딧 목록 조회
  async getPriorityCredits() {
    return metadataRepository.findPriorityCredits();
  }

  // 우선배정 크레딧 추가
  async addPriorityCredit(instructorId: number, credits: number = 1) {
    return metadataRepository.addPriorityCredit(instructorId, credits);
  }

  // 우선배정 크레딧 수정
  async updatePriorityCredit(instructorId: number, credits: number) {
    if (credits < 1) {
      throw new AppError('크레딧은 1 이상이어야 합니다.', 400, 'VALIDATION_ERROR');
    }
    return metadataRepository.updatePriorityCredit(instructorId, credits);
  }

  // 우선배정 크레딧 삭제
  async deletePriorityCredit(instructorId: number) {
    return metadataRepository.deletePriorityCredit(instructorId);
  }
}

export default new MetadataService();

// CommonJS 호환
module.exports = new MetadataService();
