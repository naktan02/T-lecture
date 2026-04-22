-- AlterTable (IF NOT EXISTS로 안전하게)
ALTER TABLE "교육기간"
ADD COLUMN IF NOT EXISTS "강의년도" INTEGER,
ADD COLUMN IF NOT EXISTS "교육시작일" DATE,
ADD COLUMN IF NOT EXISTS "교육종료일" DATE;

-- Backfill
WITH period_bounds AS (
    SELECT
        tp."id" AS period_id,
        tp."부대id" AS unit_id,
        MIN(us."교육일")::date AS start_date,
        MAX(us."교육일")::date AS end_date
    FROM "교육기간" tp
    LEFT JOIN "부대일정" us ON us."교육기간id" = tp."id"
    GROUP BY tp."id", tp."부대id"
)
UPDATE "교육기간"
SET
    "교육시작일" = pb.start_date,
    "교육종료일" = pb.end_date,
    "강의년도" = COALESCE(
        EXTRACT(YEAR FROM pb.start_date)::integer,
        (SELECT u."강의년도" FROM "부대" u WHERE u."id" = pb.unit_id)
    )
FROM period_bounds pb
WHERE "교육기간"."id" = pb.period_id;

-- CreateIndex (IF NOT EXISTS로 안전하게)
CREATE INDEX IF NOT EXISTS "교육기간_lectureYear_idx" ON "교육기간"("강의년도");
CREATE INDEX IF NOT EXISTS "교육기간_unitId_lectureYear_idx" ON "교육기간"("부대id", "강의년도");
