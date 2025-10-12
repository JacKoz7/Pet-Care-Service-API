-- CreateEnum
CREATE TYPE "public"."DayOfWeek" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- CreateEnum
CREATE TYPE "public"."StatusAdvertisement" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'BOOKED');

-- CreateEnum
CREATE TYPE "public"."StatusArchive" AS ENUM ('COMPLETED', 'CANCELLED', 'PENDING');

-- CreateTable
CREATE TABLE "public"."User" (
    "idUser" SERIAL NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "firstName" VARCHAR(45),
    "lastName" VARCHAR(45),
    "email" VARCHAR(70),
    "phoneNumber" CHAR(9),
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastActive" TIMESTAMP(3),
    "City_idCity" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "public"."Admin" (
    "idAdmin" SERIAL NOT NULL,
    "User_idUser" INTEGER NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("idAdmin")
);

-- CreateTable
CREATE TABLE "public"."City" (
    "idCity" SERIAL NOT NULL,
    "name" VARCHAR(70) NOT NULL,
    "imageUrl" VARCHAR(500),

    CONSTRAINT "City_pkey" PRIMARY KEY ("idCity")
);

-- CreateTable
CREATE TABLE "public"."Service_Provider" (
    "idService_Provider" SERIAL NOT NULL,
    "User_idUser" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_Provider_pkey" PRIMARY KEY ("idService_Provider")
);

-- CreateTable
CREATE TABLE "public"."Availability" (
    "idAvailability" SERIAL NOT NULL,
    "dayOfWeek" "public"."DayOfWeek" NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "Service_Provider_idService_Provider" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("idAvailability")
);

-- CreateTable
CREATE TABLE "public"."Advertisement" (
    "idAdvertisement" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "price" DOUBLE PRECISION,
    "status" "public"."StatusAdvertisement" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceStartTime" TIME,
    "serviceEndTime" TIME,
    "Service_idService" INTEGER NOT NULL,
    "Service_Provider_idService_Provider" INTEGER NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("idAdvertisement")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "idService" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("idService")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "idBooking" SERIAL NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "Client_idClient" INTEGER NOT NULL,
    "Service_Provider_idService_Provider" INTEGER NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("idBooking")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "idClient" SERIAL NOT NULL,
    "User_idUser" INTEGER NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("idClient")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "idFeedback" SERIAL NOT NULL,
    "rate" DECIMAL(2,1) NOT NULL,
    "description" VARCHAR(500),
    "Client_idClient" INTEGER NOT NULL,
    "Advertisement_idAdvertisement" INTEGER NOT NULL,
    "Service_Provider_idService_Provider" INTEGER NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("idFeedback")
);

-- CreateTable
CREATE TABLE "public"."Pet" (
    "idPet" SERIAL NOT NULL,
    "name" VARCHAR(45) NOT NULL,
    "age" DECIMAL(3,0) NOT NULL,
    "description" VARCHAR(500),
    "Breed_idBreed" INTEGER NOT NULL,
    "Client_idClient" INTEGER NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("idPet")
);

-- CreateTable
CREATE TABLE "public"."Breed" (
    "idBreed" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "Spiece_idSpiece" INTEGER NOT NULL,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("idBreed")
);

-- CreateTable
CREATE TABLE "public"."Spiece" (
    "idSpiece" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,

    CONSTRAINT "Spiece_pkey" PRIMARY KEY ("idSpiece")
);

-- CreateTable
CREATE TABLE "public"."Archive" (
    "idArchive" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."StatusArchive" NOT NULL DEFAULT 'COMPLETED',
    "Pet_idPet" INTEGER NOT NULL,
    "Advertisement_idAdvertisement" INTEGER NOT NULL,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("idArchive")
);

-- CreateTable
CREATE TABLE "public"."AdvertisementArchive" (
    "idAdvertisementArchive" SERIAL NOT NULL,
    "originalAdvertisementId" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "price" DOUBLE PRECISION,
    "status" "public"."StatusAdvertisement" NOT NULL DEFAULT 'INACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceStartTime" TIME,
    "serviceEndTime" TIME,
    "serviceId" INTEGER NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagesUrls" JSONB,

    CONSTRAINT "AdvertisementArchive_pkey" PRIMARY KEY ("idAdvertisementArchive")
);

-- CreateTable
CREATE TABLE "public"."AdvertisementImage" (
    "idAdvertisementImage" SERIAL NOT NULL,
    "imageUrl" VARCHAR(500) NOT NULL,
    "order" INTEGER,
    "Advertisement_idAdvertisement" INTEGER NOT NULL,

    CONSTRAINT "AdvertisementImage_pkey" PRIMARY KEY ("idAdvertisementImage")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "public"."User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_User_idUser_key" ON "public"."Admin"("User_idUser");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "public"."City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Advertisement_title_Service_Provider_idService_Provider_key" ON "public"."Advertisement"("title", "Service_Provider_idService_Provider");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "public"."Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdvertisementArchive_originalAdvertisementId_key" ON "public"."AdvertisementArchive"("originalAdvertisementId");

-- CreateIndex
CREATE INDEX "AdvertisementArchive_originalAdvertisementId_idx" ON "public"."AdvertisementArchive"("originalAdvertisementId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_City_idCity_fkey" FOREIGN KEY ("City_idCity") REFERENCES "public"."City"("idCity") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Admin" ADD CONSTRAINT "Admin_User_idUser_fkey" FOREIGN KEY ("User_idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service_Provider" ADD CONSTRAINT "Service_Provider_User_idUser_fkey" FOREIGN KEY ("User_idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "public"."Service_Provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Advertisement" ADD CONSTRAINT "Advertisement_Service_idService_fkey" FOREIGN KEY ("Service_idService") REFERENCES "public"."Service"("idService") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Advertisement" ADD CONSTRAINT "Advertisement_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "public"."Service_Provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "public"."Client"("idClient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "public"."Service_Provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_User_idUser_fkey" FOREIGN KEY ("User_idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "public"."Client"("idClient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_Advertisement_idAdvertisement_fkey" FOREIGN KEY ("Advertisement_idAdvertisement") REFERENCES "public"."Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "public"."Service_Provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pet" ADD CONSTRAINT "Pet_Breed_idBreed_fkey" FOREIGN KEY ("Breed_idBreed") REFERENCES "public"."Breed"("idBreed") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pet" ADD CONSTRAINT "Pet_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "public"."Client"("idClient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Breed" ADD CONSTRAINT "Breed_Spiece_idSpiece_fkey" FOREIGN KEY ("Spiece_idSpiece") REFERENCES "public"."Spiece"("idSpiece") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Archive" ADD CONSTRAINT "Archive_Pet_idPet_fkey" FOREIGN KEY ("Pet_idPet") REFERENCES "public"."Pet"("idPet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Archive" ADD CONSTRAINT "Archive_Advertisement_idAdvertisement_fkey" FOREIGN KEY ("Advertisement_idAdvertisement") REFERENCES "public"."Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdvertisementImage" ADD CONSTRAINT "AdvertisementImage_Advertisement_idAdvertisement_fkey" FOREIGN KEY ("Advertisement_idAdvertisement") REFERENCES "public"."Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;
