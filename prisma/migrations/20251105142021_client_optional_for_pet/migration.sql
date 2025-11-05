-- DropForeignKey
ALTER TABLE "public"."Pet" DROP CONSTRAINT "Pet_Client_idClient_fkey";

-- AlterTable
ALTER TABLE "Pet" ALTER COLUMN "Client_idClient" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "Client"("idClient") ON DELETE SET NULL ON UPDATE CASCADE;
