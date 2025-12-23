// server/src/domains/metadata/metadata.service.ts
import metadataRepository from './metadata.repository';
import AppError from '../../common/errors/AppError';

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

  // 팀 목록 조회
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

  // 팀 수정
  async updateTeam(id: string | number, name: string) {
    const teamId = parseIntIdOrThrow(id, 'teamId');
    const teamName = requireNonEmptyString(name, 'name');
    return metadataRepository.updateTeam(teamId, teamName);
  }

  // 덕목 수정
  async updateVirtue(id: string | number, name: string) {
    const virtueId = parseIntIdOrThrow(id, 'virtueId');
    const virtueName = requireNonEmptyString(name, 'name');

    return metadataRepository.updateVirtue(virtueId, virtueName);
  }

  // 템플릿 수정
  async updateMessageTemplate(key: string, title: string, body: string) {
    const templateKey = requireNonEmptyString(key, 'key');
    const t = requireNonEmptyString(title, 'title');
    const b = requireNonEmptyString(body, 'body');

    return metadataRepository.updateMessageTemplate(templateKey, t, b);
  }
}

export default new MetadataService();

// CommonJS 호환
module.exports = new MetadataService();
