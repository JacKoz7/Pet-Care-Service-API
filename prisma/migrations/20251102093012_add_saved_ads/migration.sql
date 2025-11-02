-- CreateTable
CREATE TABLE "SavedAdvertisement" (
    "id" SERIAL NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Client_idClient" INTEGER NOT NULL,
    "Advertisement_idAdvertisement" INTEGER NOT NULL,

    CONSTRAINT "SavedAdvertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedAdvertisement_Client_idClient_Advertisement_idAdvertis_key" ON "SavedAdvertisement"("Client_idClient", "Advertisement_idAdvertisement");

-- AddForeignKey
ALTER TABLE "SavedAdvertisement" ADD CONSTRAINT "SavedAdvertisement_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "Client"("idClient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAdvertisement" ADD CONSTRAINT "SavedAdvertisement_Advertisement_idAdvertisement_fkey" FOREIGN KEY ("Advertisement_idAdvertisement") REFERENCES "Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;
