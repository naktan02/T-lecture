/*
  Warnings:

  - The values [Notice] on the enum `유형__t` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "문의상태__t" AS ENUM ('Waiting', 'Answered');

-- AlterEnum
BEGIN;
CREATE TYPE "유형__t_new" AS ENUM ('Temporary', 'Confirmed');
ALTER TABLE "메시지" ALTER COLUMN "유형" TYPE "유형__t_new" USING ("유형"::text::"유형__t_new");
ALTER TYPE "유형__t" RENAME TO "유형__t_old";
ALTER TYPE "유형__t_new" RENAME TO "유형__t";
DROP TYPE "public"."유형__t_old";
COMMIT;

-- AlterTable
ALTER TABLE "강사" ADD COLUMN     "자차여부" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "메시지" ALTER COLUMN "생성일시" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "공지사항" (
    "id" SERIAL NOT NULL,
    "제목" TEXT NOT NULL,
    "본문" TEXT NOT NULL,
    "작성자id" INTEGER NOT NULL,
    "조회수" INTEGER NOT NULL DEFAULT 0,
    "상단고정" BOOLEAN NOT NULL DEFAULT false,
    "생성일시" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "수정일시" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "공지사항_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "공지수신자" (
    "공지id" INTEGER NOT NULL,
    "수신자id" INTEGER NOT NULL,
    "읽은일시" TIMESTAMP(3),

    CONSTRAINT "공지수신자_pkey" PRIMARY KEY ("공지id","수신자id")
);

-- CreateTable
CREATE TABLE "문의사항" (
    "id" SERIAL NOT NULL,
    "제목" TEXT NOT NULL,
    "본문" TEXT NOT NULL,
    "작성자id" INTEGER NOT NULL,
    "상태" "문의상태__t" NOT NULL DEFAULT 'Waiting',
    "답변" TEXT,
    "답변자id" INTEGER,
    "답변일시" TIMESTAMP(3),
    "생성일시" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "문의사항_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "공지수신자_수신자id_idx" ON "공지수신자"("수신자id");

-- AddForeignKey
ALTER TABLE "공지수신자" ADD CONSTRAINT "공지수신자_공지id_fkey" FOREIGN KEY ("공지id") REFERENCES "공지사항"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "공지수신자" ADD CONSTRAINT "공지수신자_수신자id_fkey" FOREIGN KEY ("수신자id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
