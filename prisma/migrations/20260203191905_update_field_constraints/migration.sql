-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('주인공', '조연');

-- Story 필드 제약 조건 변경
ALTER TABLE "Story" ALTER COLUMN "title" TYPE VARCHAR(100);
ALTER TABLE "Story" ALTER COLUMN "authorName" TYPE VARCHAR(50);
ALTER TABLE "Story" ALTER COLUMN "description" TYPE VARCHAR(400);

-- Character 필드 제약 조건 변경
ALTER TABLE "Character" ALTER COLUMN "name" TYPE VARCHAR(50);
ALTER TABLE "Character" ALTER COLUMN "description" TYPE VARCHAR(400);
ALTER TABLE "Character" ALTER COLUMN "personality" TYPE VARCHAR(400);
ALTER TABLE "Character" ALTER COLUMN "firstMessage" TYPE VARCHAR(100);

-- Character.role을 enum으로 변경 (기존 데이터 변환)
ALTER TABLE "Character" ALTER COLUMN "role" TYPE "CharacterRole" USING "role"::"CharacterRole";
