-- AddForeignKey
ALTER TABLE "public"."AdvertisementArchive" ADD CONSTRAINT "AdvertisementArchive_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("idService") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdvertisementArchive" ADD CONSTRAINT "AdvertisementArchive_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "public"."Service_Provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;
