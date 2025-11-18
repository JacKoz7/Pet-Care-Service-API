/*
  Warnings:

  - You are about to drop the `ProviderReview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ProviderReview" DROP CONSTRAINT "ProviderReview_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProviderReview" DROP CONSTRAINT "ProviderReview_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProviderReview" DROP CONSTRAINT "ProviderReview_serviceProviderId_fkey";

-- DropTable
DROP TABLE "public"."ProviderReview";

-- CreateTable
CREATE TABLE "Review" (
    "idReview" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Client_idClient" INTEGER NOT NULL,
    "Service_Provider_idService_Provider" INTEGER NOT NULL,
    "Booking_idBooking" INTEGER NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("idReview")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_Booking_idBooking_key" ON "Review"("Booking_idBooking");

-- CreateIndex
CREATE INDEX "Review_Service_Provider_idService_Provider_idx" ON "Review"("Service_Provider_idService_Provider");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "Client"("idClient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_Booking_idBooking_fkey" FOREIGN KEY ("Booking_idBooking") REFERENCES "Booking"("idBooking") ON DELETE RESTRICT ON UPDATE CASCADE;
