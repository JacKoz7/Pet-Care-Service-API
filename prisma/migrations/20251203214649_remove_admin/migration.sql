/*
  Warnings:

  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Availability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_User_idUser_fkey";

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_Service_Provider_idService_Provider_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_Advertisement_idAdvertisement_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_Client_idClient_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_Service_Provider_idService_Provider_fkey";

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Availability";

-- DropTable
DROP TABLE "Feedback";

-- DropEnum
DROP TYPE "ActivityLevel";

-- DropEnum
DROP TYPE "DayOfWeek";

-- DropEnum
DROP TYPE "DietType";

-- DropEnum
DROP TYPE "EnvironmentType";

-- DropEnum
DROP TYPE "Sex";
