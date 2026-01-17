// server/src/domains/distance/kakaoUsage.repository.ts
import prisma from '../../libs/prisma';

interface PrismaError extends Error {
  code?: string;
}

// 테스트용 일일 한도 (실제 운영 시 증가)
export const DAILY_GEOCODE_LIMIT = 3000;

class KakaoUsageRepository {
  // 오늘 날짜만 반환
  private _todayDateOnly(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  // 오늘 사용량 row 없으면 생성, 있으면 그대로 반환
  async getOrCreateToday() {
    const today = this._todayDateOnly();

    let usage = await prisma.kakaoApiUsage.findUnique({
      where: { date: today },
    });

    if (usage) return usage;

    try {
      usage = await prisma.kakaoApiUsage.create({
        data: {
          date: today,
          routeCount: 0,
          geocodeCount: 0,
        },
      });
      return usage;
    } catch (e) {
      if ((e as PrismaError).code === 'P2002') {
        return prisma.kakaoApiUsage.findUnique({
          where: { date: today },
        });
      }
      throw e;
    }
  }

  // 오늘 geocode 사용량 조회
  async getTodayGeocodeUsage(): Promise<number> {
    const usage = await this.getOrCreateToday();
    return usage?.geocodeCount ?? 0;
  }

  // 일일 한도 확인
  async canUseGeocode(): Promise<boolean> {
    const current = await this.getTodayGeocodeUsage();
    return current < DAILY_GEOCODE_LIMIT;
  }

  // routeCount 증가
  async incrementRouteCount(by = 1) {
    const usage = await this.getOrCreateToday();
    return prisma.kakaoApiUsage.update({
      where: { id: usage!.id },
      data: {
        routeCount: { increment: by },
      },
    });
  }

  // geocodeCount 증가
  async incrementGeocodeCount(by = 1) {
    const usage = await this.getOrCreateToday();
    return prisma.kakaoApiUsage.update({
      where: { id: usage!.id },
      data: {
        geocodeCount: { increment: by },
      },
    });
  }
}

export default new KakaoUsageRepository();

// CommonJS 호환
module.exports = new KakaoUsageRepository();
