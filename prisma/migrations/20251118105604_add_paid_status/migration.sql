-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "advertisementId" INTEGER,
ADD COLUMN     "price" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("idAdvertisement") ON DELETE SET NULL ON UPDATE CASCADE;
