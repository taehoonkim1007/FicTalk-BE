-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "voiceSettings" JSONB;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "backgroundImage" VARCHAR(2048);
