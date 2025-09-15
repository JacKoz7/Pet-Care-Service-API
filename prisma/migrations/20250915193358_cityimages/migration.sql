/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `City` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."City" ADD COLUMN     "imageUrl" VARCHAR(500);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "public"."City"("name");
