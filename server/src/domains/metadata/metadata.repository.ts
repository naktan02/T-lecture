// server/src/domains/metadata/metadata.repository.ts
import { Prisma } from '@prisma/client';
import prisma from '../../libs/prisma';

interface CategoryItem {
  id: string;
  label: string;
}

class MetadataRepository {
  // 덕목(강의) 조회
  async findVirtues() {
    return prisma.virtue.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // 팀 조회 (삭제되지 않은 팀만)
  async findTeams() {
    return prisma.team.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  // 모든 팀 조회 (삭제된 팀 포함 - 이력 조회용)
  async findAllTeamsIncludingDeleted() {
    return prisma.team.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // 유저 카테고리 조회 (ENUM → 하드코딩 반환)
  async findCategories(): Promise<CategoryItem[]> {
    return [
      { id: 'Main', label: '주강사' },
      { id: 'Co', label: '부강사' },
      { id: 'Assistant', label: '보조강사' },
      { id: 'Practicum', label: '실습강사' },
    ];
  }

  // 메시지 템플릿 전체 조회
  async findMessageTemplates() {
    return prisma.messageTemplate.findMany({
      orderBy: { key: 'asc' },
    });
  }

  // 메시지 템플릿 단건 조회
  async findTemplateByKey(key: string) {
    return prisma.messageTemplate.findUnique({
      where: { key },
    });
  }

  // 팀 생성
  async createTeam(name: string) {
    return prisma.team.create({
      data: { name },
    });
  }

  // 팀 수정
  async updateTeam(id: number, name: string) {
    return prisma.team.update({
      where: { id },
      data: { name },
    });
  }

  // 팀 Soft Delete
  async softDeleteTeam(id: number) {
    return prisma.team.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 덕목 생성
  async createVirtue(name: string) {
    return prisma.virtue.create({
      data: { name },
    });
  }

  // 덕목 수정
  async updateVirtue(id: number, name: string) {
    return prisma.virtue.update({
      where: { id },
      data: { name },
    });
  }

  // 덕목 Hard Delete (CASCADE로 강사-덕목 관계도 삭제)
  async deleteVirtue(id: number) {
    return prisma.virtue.delete({
      where: { id },
    });
  }

  // 메시지 템플릿 수정 (body와 formatPresets는 JSONB)
  async updateMessageTemplate(
    key: string,
    title: string,
    body: object,
    formatPresets?: object | null,
  ) {
    return prisma.messageTemplate.update({
      where: { key },
      data: {
        title,
        body,
        // undefined면 업데이트 안 함, null이면 Prisma.DbNull, 값 있으면 그대로
        ...(formatPresets !== undefined && {
          formatPresets: formatPresets === null ? Prisma.DbNull : formatPresets,
        }),
      },
    });
  }
}

export default new MetadataRepository();

// CommonJS 호환
module.exports = new MetadataRepository();
