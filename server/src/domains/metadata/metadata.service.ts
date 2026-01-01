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
}

export default new MetadataService();

// CommonJS 호환
module.exports = new MetadataService();
