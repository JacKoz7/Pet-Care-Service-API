/*
  Warnings:

  - You are about to drop the column `Breed_idBreed` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the `Breed` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `Spiece_idSpiece` to the `Pet` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Breed" DROP CONSTRAINT "Breed_Spiece_idSpiece_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pet" DROP CONSTRAINT "Pet_Breed_idBreed_fkey";

-- AlterTable
ALTER TABLE "Pet" DROP COLUMN "Breed_idBreed",
ADD COLUMN     "Spiece_idSpiece" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."Breed";

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_Spiece_idSpiece_fkey" FOREIGN KEY ("Spiece_idSpiece") REFERENCES "Spiece"("idSpiece") ON DELETE RESTRICT ON UPDATE CASCADE;
