/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Spiece` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Spiece_name_key" ON "public"."Spiece"("name");
