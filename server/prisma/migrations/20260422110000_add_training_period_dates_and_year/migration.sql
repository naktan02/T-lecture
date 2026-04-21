-- AlterTable
ALTER TABLE "교육기간"
ADD COLUMN     "강의년도" INTEGER,
ADD COLUMN     "교육시작일" DATE,
ADD COLUMN     "교육종료일" DATE;

-- Backfill
WITH period_bounds AS (
    SELECT
        tp."id" AS period_id,
        MIN(us."교육일")::date AS start_date,
        MAX(us."교육일")::date AS end_date
    FROM "교육기간" tp
    LEFT JOIN "부대일정" us ON us."교육기간id" = tp."id"
    GROUP BY tp."id"
)
UPDATE "교육기간" tp
SET
    "교육시작일" = pb.start_date,
    "교육종료일" = pb.end_date,
    "강의년도" = COALESCE(EXTRACT(YEAR FROM pb.start_date)::integer, u."강의년도")
FROM period_bounds pb
JOIN "부대" u ON u."id" = tp."부대id"
WHERE tp."id" = pb.period_id;

-- CreateIndex
CREATE INDEX "교육기간_lectureYear_idx" ON "교육기간"("강의년도");

-- CreateIndex
CREATE INDEX "교육기간_unitId_lectureYear_idx" ON "교육기간"("부대id", "강의년도");
