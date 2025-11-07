-- CreateTable
CREATE TABLE "AdvertisementSpiece" (
    "advertisementId" INTEGER NOT NULL,
    "spieceId" INTEGER NOT NULL,

    CONSTRAINT "AdvertisementSpiece_pkey" PRIMARY KEY ("advertisementId","spieceId")
);

-- AddForeignKey
ALTER TABLE "AdvertisementSpiece" ADD CONSTRAINT "AdvertisementSpiece_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("idAdvertisement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertisementSpiece" ADD CONSTRAINT "AdvertisementSpiece_spieceId_fkey" FOREIGN KEY ("spieceId") REFERENCES "Spiece"("idSpiece") ON DELETE RESTRICT ON UPDATE CASCADE;
