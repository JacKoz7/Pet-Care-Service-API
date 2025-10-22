/*
  Warnings:

  - Added the required column `Pet_idPet` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "Pet_idPet" INTEGER NOT NULL,
ADD COLUMN     "message" VARCHAR(1000),
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_Pet_idPet_fkey" FOREIGN KEY ("Pet_idPet") REFERENCES "Pet"("idPet") ON DELETE RESTRICT ON UPDATE CASCADE;
