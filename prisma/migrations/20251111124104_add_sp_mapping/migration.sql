/*
  Warnings:

  - You are about to drop the `Service_Provider` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Advertisement" DROP CONSTRAINT "Advertisement_Service_Provider_idService_Provider_fkey";

-- DropForeignKey
ALTER TABLE "public"."AdvertisementArchive" DROP CONSTRAINT "AdvertisementArchive_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Availability" DROP CONSTRAINT "Availability_Service_Provider_idService_Provider_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_Service_Provider_idService_Provider_fkey";

-- DropForeignKey
ALTER TABLE "public"."Feedback" DROP CONSTRAINT "Feedback_Service_Provider_idService_Provider_fkey";

-- DropForeignKey
ALTER TABLE "public"."Service_Provider" DROP CONSTRAINT "Service_Provider_User_idUser_fkey";

-- DropTable
DROP TABLE "public"."Service_Provider";

-- CreateTable
CREATE TABLE "service__provider" (
    "idService_Provider" SERIAL NOT NULL,
    "User_idUser" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service__provider_pkey" PRIMARY KEY ("idService_Provider")
);

-- AddForeignKey
ALTER TABLE "service__provider" ADD CONSTRAINT "service__provider_User_idUser_fkey" FOREIGN KEY ("User_idUser") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertisementArchive" ADD CONSTRAINT "AdvertisementArchive_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;
