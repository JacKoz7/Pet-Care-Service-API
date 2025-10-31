/*
  Warnings:

  - You are about to drop the column `Pet_idPet` on the `Booking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_Pet_idPet_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "Pet_idPet";

-- CreateTable
CREATE TABLE "BookingPet" (
    "idBookingPet" SERIAL NOT NULL,
    "Booking_idBooking" INTEGER NOT NULL,
    "Pet_idPet" INTEGER NOT NULL,

    CONSTRAINT "BookingPet_pkey" PRIMARY KEY ("idBookingPet")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingPet_Booking_idBooking_Pet_idPet_key" ON "BookingPet"("Booking_idBooking", "Pet_idPet");

-- AddForeignKey
ALTER TABLE "BookingPet" ADD CONSTRAINT "BookingPet_Booking_idBooking_fkey" FOREIGN KEY ("Booking_idBooking") REFERENCES "Booking"("idBooking") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPet" ADD CONSTRAINT "BookingPet_Pet_idPet_fkey" FOREIGN KEY ("Pet_idPet") REFERENCES "Pet"("idPet") ON DELETE RESTRICT ON UPDATE CASCADE;
