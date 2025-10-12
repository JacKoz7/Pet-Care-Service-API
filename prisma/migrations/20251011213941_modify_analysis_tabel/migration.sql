/*
  Warnings:

  - You are about to drop the column `missingData` on the `Analysis` table. All the data in the column will be lost.
  - Added the required column `inputData` to the `Analysis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Analysis" DROP COLUMN "missingData",
ADD COLUMN     "inputData" JSONB NOT NULL;
