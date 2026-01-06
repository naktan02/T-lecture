// server/src/domains/metadata/metadata.repository.ts
import { Prisma } from '../../generated/prisma/client.js';
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

  // ===== SystemConfig (배정 설정) =====

  // 시스템 설정 조회 (특정 키들만)
  async findSystemConfigs(keys: string[]) {
    return prisma.systemConfig.findMany({
      where: { key: { in: keys } },
      orderBy: { key: 'asc' },
    });
  }

  // 시스템 설정 upsert (없으면 생성, 있으면 수정)
  async upsertSystemConfig(key: string, value: string, description?: string) {
    return prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, description },
    });
  }

  // ===== InstructorPenalty (패널티 관리) =====

  // 활성 패널티 목록 조회 (만료되지 않은 것만, 유저 정보 포함)
  async findActivePenalties() {
    return prisma.instructorPenalty.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            instructor: {
              select: {
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  // 모든 패널티 조회
  async findAllPenalties() {
    return prisma.instructorPenalty.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            instructor: {
              select: {
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { expiresAt: 'desc' },
    });
  }

  // 특정 강사 패널티 조회
  async findPenaltyByUserId(userId: number) {
    return prisma.instructorPenalty.findUnique({
      where: { userId },
    });
  }

  // 패널티 추가 (또는 기간 연장)
  async addPenalty(userId: number, days: number) {
    const now = new Date();
    const existing = await prisma.instructorPenalty.findUnique({
      where: { userId },
    });

    if (existing) {
      // 기존 만료일이 과거면 현재 기준, 아니면 기존 만료일 기준으로 연장
      const baseDate = existing.expiresAt > now ? existing.expiresAt : now;
      const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      return prisma.instructorPenalty.update({
        where: { userId },
        data: {
          count: { increment: 1 },
          expiresAt: newExpiresAt,
        },
      });
    } else {
      // 새로 생성
      return prisma.instructorPenalty.create({
        data: {
          userId,
          count: 1,
          expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // 패널티 만료일 수정
  async updatePenaltyExpiration(userId: number, expiresAt: Date) {
    return prisma.instructorPenalty.update({
      where: { userId },
      data: { expiresAt },
    });
  }

  // 패널티 삭제
  async deletePenalty(userId: number) {
    return prisma.instructorPenalty.delete({
      where: { userId },
    });
  }

  // 패널티 기간 차감 (관리자 재추가 시)
  async reducePenalty(userId: number, days: number) {
    const penalty = await prisma.instructorPenalty.findUnique({
      where: { userId },
    });

    if (!penalty) return null;

    const newExpiresAt = new Date(penalty.expiresAt.getTime() - days * 24 * 60 * 60 * 1000);
    const now = new Date();

    // 차감 후 만료일이 현재보다 과거면 패널티 삭제
    if (newExpiresAt <= now) {
      return prisma.instructorPenalty.delete({
        where: { userId },
      });
    }

    // 차감 후 count도 -1 (최소 1)
    return prisma.instructorPenalty.update({
      where: { userId },
      data: {
        count: { decrement: 1 },
        expiresAt: newExpiresAt,
      },
    });
  }

  // ===== InstructorPriorityCredit (우선배정 관리) =====

  // 우선배정 크레딧 목록 조회
  async findPriorityCredits() {
    return prisma.instructorPriorityCredit.findMany({
      include: {
        instructor: {
          include: {
            user: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { credits: 'desc' },
    });
  }

  // 우선배정 크레딧 추가/증가
  async addPriorityCredit(instructorId: number, credits: number = 1) {
    return prisma.instructorPriorityCredit.upsert({
      where: { instructorId },
      update: { credits: { increment: credits } },
      create: { instructorId, credits },
    });
  }

  // 우선배정 크레딧 수정
  async updatePriorityCredit(instructorId: number, credits: number) {
    return prisma.instructorPriorityCredit.update({
      where: { instructorId },
      data: { credits },
    });
  }

  // 우선배정 크레딧 차감 (배정 시 사용)
  async consumePriorityCredit(instructorId: number) {
    const credit = await prisma.instructorPriorityCredit.findUnique({
      where: { instructorId },
    });

    if (!credit) return null;

    if (credit.credits <= 1) {
      // 크레딧 1개면 삭제
      return prisma.instructorPriorityCredit.delete({
        where: { instructorId },
      });
    }

    // 크레딧 감소
    return prisma.instructorPriorityCredit.update({
      where: { instructorId },
      data: { credits: { decrement: 1 } },
    });
  }

  // 우선배정 크레딧 삭제
  async deletePriorityCredit(instructorId: number) {
    return prisma.instructorPriorityCredit.delete({
      where: { instructorId },
    });
  }
}

export default new MetadataRepository();

// CommonJS 호환
module.exports = new MetadataRepository();
