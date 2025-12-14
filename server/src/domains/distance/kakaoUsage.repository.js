// server/src/modules/distance/repositories/kakaoUsage.repository.js
const prisma = require('../../libs/prisma');

class KakaoUsageRepository {
    // 오늘 날짜만 반환
    _todayDateOnly() {
        const now = new Date();
        return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    // 오늘 사용량 row 없으면 생성, 있으면 그대로 반환
    async getOrCreateToday() {
        const today = this._todayDateOnly();

        let usage = await prisma.kakaoApiUsage.findUnique({
        where: { date: today },   // date는 @unique
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
        if (e.code === 'P2002') {
            return prisma.kakaoApiUsage.findUnique({
            where: { date: today },
            });
        }
        throw e;
        }
    }

    // routeCount 증가
    async incrementRouteCount(by = 1) {
        const usage = await this.getOrCreateToday();
        return prisma.kakaoApiUsage.update({
        where: { id: usage.id },
        data: {
            routeCount: { increment: by },
        },
        });
    }

    // geocodeCount 증가
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
