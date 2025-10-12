-- CreateTable
CREATE TABLE "public"."PetImage" (
    "idPetImage" SERIAL NOT NULL,
    "imageUrl" VARCHAR(500) NOT NULL,
    "order" INTEGER,
    "Pet_idPet" INTEGER NOT NULL,

    CONSTRAINT "PetImage_pkey" PRIMARY KEY ("idPetImage")
);

-- AddForeignKey
ALTER TABLE "public"."PetImage" ADD CONSTRAINT "PetImage_Pet_idPet_fkey" FOREIGN KEY ("Pet_idPet") REFERENCES "public"."Pet"("idPet") ON DELETE RESTRICT ON UPDATE CASCADE;
