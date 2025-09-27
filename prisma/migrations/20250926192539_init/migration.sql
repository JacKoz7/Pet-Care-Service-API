/*
  Warnings:

  - Made the column `City_idCity` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_City_idCity_fkey";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "City_idCity" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_City_idCity_fkey" FOREIGN KEY ("City_idCity") REFERENCES "public"."City"("idCity") ON DELETE RESTRICT ON UPDATE CASCADE;
