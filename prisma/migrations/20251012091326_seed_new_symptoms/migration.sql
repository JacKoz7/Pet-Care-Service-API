/*
  Warnings:

  - You are about to drop the column `activityLevel` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `dietType` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `environmentType` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `isSterilized` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `knownAllergies` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `sex` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `vaccinationUpToDate` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Pet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Pet" DROP COLUMN "activityLevel",
DROP COLUMN "dietType",
DROP COLUMN "environmentType",
DROP COLUMN "isSterilized",
DROP COLUMN "knownAllergies",
DROP COLUMN "sex",
DROP COLUMN "vaccinationUpToDate",
DROP COLUMN "weight";
