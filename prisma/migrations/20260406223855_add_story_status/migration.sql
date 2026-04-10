-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable: Story에 status, publishedAt 컬럼 추가 (DRAFT 기본값)
ALTER TABLE "Story"
  ADD COLUMN "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "publishedAt" TIMESTAMP(3);

-- 기존 데이터는 모두 PUBLISHED로 백필 (이미 공개되어 사용 중이므로)
-- publishedAt은 createdAt으로 설정하여 정렬/통계의 일관성 확보
UPDATE "Story" SET "status" = 'PUBLISHED', "publishedAt" = "createdAt";

-- CreateIndex
CREATE INDEX "Story_status_idx" ON "Story"("status");
CREATE INDEX "Story_categoryId_status_idx" ON "Story"("categoryId", "status");
