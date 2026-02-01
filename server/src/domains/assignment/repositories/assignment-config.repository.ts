// server/src/domains/assignment/repositories/assignment-config.repository.ts
// 배정 설정/패널티 전용 Repository (CQRS - Config)

import prisma from '../../../libs/prisma';
import type { PenaltyReason, PenaltyWithReasons } from './types';

/**
 * 배정 설정 및 패널티 관련 Repository
 */
class AssignmentConfigRepository {
  /**
   * 시스템 설정 값 조회
   */
  async getSystemConfigValue(key: string): Promise<string | null> {
    const cfg = await prisma.systemConfig.findUnique({ where: { key } });
    return cfg?.value ?? null;
  }

  /**
   * 여러 시스템 설정 값 한 번에 조회 (배치)
   */
  async getSystemConfigValues(keys: string[]): Promise<Map<string, string | null>> {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });
    const result = new Map<string, string | null>();
    for (const key of keys) {
      const cfg = configs.find((c) => c.key === key);
      result.set(key, cfg?.value ?? null);
    }
    return result;
  }

  /**
   * 우선배정 크레딧 소모 (1 감소, 0이면 삭제)
   */
  async consumePriorityCredit(instructorId: number): Promise<void> {
    const existing = await prisma.instructorPriorityCredit.findUnique({
      where: { instructorId },
    });

    if (!existing || existing.credits <= 0) return;

    if (existing.credits <= 1) {
      await prisma.instructorPriorityCredit.delete({ where: { instructorId } });
    } else {
      await prisma.instructorPriorityCredit.update({
        where: { instructorId },
        data: { credits: existing.credits - 1 },
      });
    }
  }

  /**
   * 강사 패널티 추가 (만료일 연장)
   */
  async addPenalty(instructorId: number, days: number, reason?: PenaltyReason): Promise<void> {
    const now = new Date();
    const existing = await prisma.instructorPenalty.findUnique({
      where: { userId: instructorId },
    });

    if (existing) {
      const baseDate = existing.expiresAt > now ? existing.expiresAt : now;
      const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      const penaltyWithReasons = existing as unknown as PenaltyWithReasons;
      const existingReasons: PenaltyReason[] = penaltyWithReasons.reasons || [];

      await prisma.instructorPenalty.update({
        where: { userId: instructorId },
        data: {
          count: { increment: 1 },
          expiresAt: newExpiresAt,
          reasons: (reason
            ? [...existingReasons, reason]
            : existingReasons) as unknown as Parameters<
            typeof prisma.instructorPenalty.update
          >[0]['data']['reasons'],
        },
      });
    } else {
      await prisma.instructorPenalty.create({
        data: {
          userId: instructorId,
          count: 1,
          expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
          reasons: (reason ? [reason] : []) as unknown as Parameters<
            typeof prisma.instructorPenalty.create
          >[0]['data']['reasons'],
        },
      });
    }
  }
}

export const assignmentConfigRepository = new AssignmentConfigRepository();
export default assignmentConfigRepository;
