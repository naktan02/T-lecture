// server/src/modules/distance/repositories/kakaoUsage.repository.js
const prisma = require('../../../libs/prisma');

class KakaoUsageRepository {
    _todayDateOnly() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    async getOrCreateToday() {
        const today = this._todayDateOnly();

        let usage = await prisma.kakaoApiUsage.findUnique({
        where: { date: today },
        });

        if (!usage) {
        usage = await prisma.kakaoApiUsage.create({
            data: { date: today },
        });
        }

        return usage;
    }

    async incrementRouteCount(by = 1) {
        const usage = await this.getOrCreateToday();
        return prisma.kakaoApiUsage.update({
        where: { date: usage.date },
        data: {
            routeCount: { increment: by },
        },
        });
    }

    async incrementGeocodeCount(by = 1) {
        const usage = await this.getOrCreateToday();
        return prisma.kakaoApiUsage.update({
        where: { date: usage.date },
        data: {
            geocodeCount: { increment: by },
        },
        });
    }
}

module.exports = new KakaoUsageRepository();
