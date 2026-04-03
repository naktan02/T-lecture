-- CreateTable
CREATE TABLE "notice_attachment" (
    "id" SERIAL NOT NULL,
    "noticeId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notice_attachment_noticeId_idx" ON "notice_attachment"("noticeId");

-- CreateIndex
CREATE INDEX "notice_attachment_expiresAt_idx" ON "notice_attachment"("expiresAt");

-- AddForeignKey
ALTER TABLE "notice_attachment"
ADD CONSTRAINT "notice_attachment_noticeId_fkey"
FOREIGN KEY ("noticeId") REFERENCES "공지사항"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
