/*
  Warnings:

  - You are about to alter the column `description` on the `Character` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `description` on the `Story` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `marketingTitle` on the `Story` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `marketingDescription` on the `Story` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.

*/
-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);

-- AlterTable
ALTER TABLE "Story" ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000),
ALTER COLUMN "marketingTitle" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "marketingDescription" SET DATA TYPE VARCHAR(1000);
