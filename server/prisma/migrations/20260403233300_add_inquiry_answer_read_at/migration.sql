-- Add missing column referenced by Prisma Inquiry.answerReadAt
ALTER TABLE "문의사항"
ADD COLUMN IF NOT EXISTS "답변읽은일시" TIMESTAMP(3);
