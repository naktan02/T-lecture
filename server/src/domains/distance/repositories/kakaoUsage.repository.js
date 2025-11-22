// server/src/modules/distance/repositories/kakaoUsage.repository.js
const prisma = require('../../../libs/prisma');

class KakaoUsageRepository {
    _todayDateOnly() {
        const now = new Date();
        return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    // 오늘 사용량 row 없으면 생성, 있으면 그대로 반환
    async getOrCreateToday() {
        const today = this._todayDateOnly();

        // 1) 먼저 조회
        let usage = await prisma.kakaoApiUsage.findUnique({
        where: { date: today },   // date는 @unique
        });

        if (usage) return usage;

        // 2) 없으면 생성 시도
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
        // 3) 동시성 / 중복으로 UNIQUE 에러(P2002) 난 경우 → 다시 조회해서 반환
        if (e.code === 'P2002') {
            return prisma.kakaoApiUsage.findUnique({
            where: { date: today },
            });
        }
        throw e;
        }
    }

    async incrementRouteCount(by = 1) {
        const usage = await this.getOrCreateToday();
        return prisma.kakaoApiUsage.update({
        where: { id: usage.id },      // ✅ PK(id) 기준으로 업데이트
        data: {
            routeCount: { increment: by },
        },
        });
    }

    async incrementGeocodeCount(by = 1) {
        const usage = await this.getOrCreateToday();
        return prisma.kakaoApiUsage.update({
        where: { id: usage.id },
        data: {
            geocodeCount: { increment: by },
        },
        });
    }
}

module.exports = new KakaoUsageRepository();
