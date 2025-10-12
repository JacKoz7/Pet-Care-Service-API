/*
  Warnings:

  - Added the required column `activityLevel` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dietType` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `environmentType` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isSterilized` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sex` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vaccinationUpToDate` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Pet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Sex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."ActivityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."DietType" AS ENUM ('DRY', 'WET', 'BARF', 'HOMEMADE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EnvironmentType" AS ENUM ('INDOOR', 'OUTDOOR', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- AlterTable
ALTER TABLE "public"."Pet" ADD COLUMN     "activityLevel" "public"."ActivityLevel" NOT NULL,
ADD COLUMN     "chronicDiseases" TEXT[],
ADD COLUMN     "dietType" "public"."DietType" NOT NULL,
ADD COLUMN     "environmentType" "public"."EnvironmentType" NOT NULL,
ADD COLUMN     "isSterilized" BOOLEAN NOT NULL,
ADD COLUMN     "knownAllergies" TEXT[],
ADD COLUMN     "sex" "public"."Sex" NOT NULL,
ADD COLUMN     "vaccinationUpToDate" BOOLEAN NOT NULL,
ADD COLUMN     "weight" DECIMAL(5,2) NOT NULL;

-- CreateTable
CREATE TABLE "public"."Symptom" (
    "idSymptom" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "defaultSeverity" "public"."Severity" NOT NULL DEFAULT 'MODERATE',

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("idSymptom")
);

-- CreateTable
CREATE TABLE "public"."Analysis" (
    "idAnalysis" SERIAL NOT NULL,
    "missingData" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "diagnoses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Pet_idPet" INTEGER NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("idAnalysis")
);

-- CreateIndex
CREATE UNIQUE INDEX "Symptom_code_key" ON "public"."Symptom"("code");

-- AddForeignKey
ALTER TABLE "public"."Analysis" ADD CONSTRAINT "Analysis_Pet_idPet_fkey" FOREIGN KEY ("Pet_idPet") REFERENCES "public"."Pet"("idPet") ON DELETE RESTRICT ON UPDATE CASCADE;
