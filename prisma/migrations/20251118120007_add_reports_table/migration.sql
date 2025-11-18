-- CreateTable
CREATE TABLE "Report" (
    "idReport" SERIAL NOT NULL,
    "message" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Booking_idBooking" INTEGER NOT NULL,
    "Client_idClient" INTEGER NOT NULL,
    "Service_Provider_idService_Provider" INTEGER NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("idReport")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_Booking_idBooking_fkey" FOREIGN KEY ("Booking_idBooking") REFERENCES "Booking"("idBooking") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_Client_idClient_fkey" FOREIGN KEY ("Client_idClient") REFERENCES "Client"("idClient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_Service_Provider_idService_Provider_fkey" FOREIGN KEY ("Service_Provider_idService_Provider") REFERENCES "service__provider"("idService_Provider") ON DELETE RESTRICT ON UPDATE CASCADE;
