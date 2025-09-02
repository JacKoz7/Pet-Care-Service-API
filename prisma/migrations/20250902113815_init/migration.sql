-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CLIENT', 'SERVICE_PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AdvertisementStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "public"."User" (
    "idUser" SERIAL NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "firstName" VARCHAR(45) NOT NULL,
    "lastName" VARCHAR(45) NOT NULL,
    "email" VARCHAR(70) NOT NULL,
    "phoneNumber" CHAR(9),
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "cityId" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "public"."Service_Provider" (
    "idServiceProvider" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Service_Provider_pkey" PRIMARY KEY ("idServiceProvider")
);

-- CreateTable
CREATE TABLE "public"."Admin" (
    "idAdmin" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("idAdmin")
);

-- CreateTable
CREATE TABLE "public"."City" (
    "idCity" SERIAL NOT NULL,
    "name" VARCHAR(70) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("idCity")
);

-- CreateTable
CREATE TABLE "public"."Pet" (
    "idPet" SERIAL NOT NULL,
    "name" VARCHAR(45) NOT NULL,
    "age" DECIMAL(3,0) NOT NULL,
    "description" VARCHAR(500),
    "breedId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("idPet")
);

-- CreateTable
CREATE TABLE "public"."Breed" (
    "idBreed" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "spieceId" INTEGER NOT NULL,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("idBreed")
);

-- CreateTable
CREATE TABLE "public"."Spiece" (
    "idSpiece" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,

    CONSTRAINT "Spiece_pkey" PRIMARY KEY ("idSpiece")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "idService" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("idService")
);

-- CreateTable
CREATE TABLE "public"."Advertisement" (
    "idAdvertisement" SERIAL NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("idAdvertisement")
);

-- CreateTable
CREATE TABLE "public"."Status_Advertisement" (
    "idStatus" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,

    CONSTRAINT "Status_Advertisement_pkey" PRIMARY KEY ("idStatus")
);

-- CreateTable
CREATE TABLE "public"."Availability" (
    "idAvailability" SERIAL NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("idAvailability")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "idBooking" SERIAL NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "clientId" INTEGER NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "advertisementId" INTEGER NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("idBooking")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "idFeedback" SERIAL NOT NULL,
    "rate" DECIMAL(2,1) NOT NULL,
    "description" VARCHAR(500),
    "clientId" INTEGER NOT NULL,
    "advertisementId" INTEGER NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("idFeedback")
);

-- CreateTable
CREATE TABLE "public"."Archive" (
    "idArchive" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "petId" INTEGER NOT NULL,
    "advertisementId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("idArchive")
);

-- CreateTable
CREATE TABLE "public"."Status_Archive" (
    "idStatus" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,

    CONSTRAINT "Status_Archive_pkey" PRIMARY KEY ("idStatus")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "public"."User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Service_Provider_userId_key" ON "public"."Service_Provider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "public"."Admin"("userId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("idCity") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service_Provider" ADD CONSTRAINT "Service_Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pet" ADD CONSTRAINT "Pet_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "public"."Breed"("idBreed") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pet" ADD CONSTRAINT "Pet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Breed" ADD CONSTRAINT "Breed_spieceId_fkey" FOREIGN KEY ("spieceId") REFERENCES "public"."Spiece"("idSpiece") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Advertisement" ADD CONSTRAINT "Advertisement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("idService") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Advertisement" ADD CONSTRAINT "Advertisement_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "public"."Service_Provider"("idServiceProvider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Advertisement" ADD CONSTRAINT "Advertisement_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "public"."Status_Advertisement"("idStatus") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "public"."Service_Provider"("idServiceProvider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "public"."Service_Provider"("idServiceProvider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "public"."Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "public"."Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "public"."Service_Provider"("idServiceProvider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Archive" ADD CONSTRAINT "Archive_petId_fkey" FOREIGN KEY ("petId") REFERENCES "public"."Pet"("idPet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Archive" ADD CONSTRAINT "Archive_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "public"."Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Archive" ADD CONSTRAINT "Archive_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "public"."Status_Archive"("idStatus") ON DELETE RESTRICT ON UPDATE CASCADE;
