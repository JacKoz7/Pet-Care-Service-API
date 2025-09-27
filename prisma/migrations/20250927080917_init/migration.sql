/*
  Warnings:

  - Made the column `endDate` on table `Advertisement` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Advertisement" ALTER COLUMN "endDate" SET NOT NULL;
