import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Dodaj miasta
  const cities = await Promise.all([
    prisma.city.create({ data: { name: "Warszawa" } }),
    prisma.city.create({ data: { name: "Kraków" } }),
    prisma.city.create({ data: { name: "Gdańsk" } }),
  ]);

  console.log('Utworzono miasta:', cities.length);

  // Dodaj gatunki
  const dogSpecies = await prisma.spiece.create({
    data: { name: "Pies" },
  });

  const catSpecies = await prisma.spiece.create({
    data: { name: "Kot" },
  });

  // Dodaj rasy
  await Promise.all([
    prisma.breed.create({
      data: { name: "Labrador", spieceId: dogSpecies.idSpiece },
    }),
    prisma.breed.create({
      data: { name: "German Shepherd", spieceId: dogSpecies.idSpiece },
    }),
    prisma.breed.create({
      data: { name: "Persian Cat", spieceId: catSpecies.idSpiece },
    }),
  ]);

  // Dodaj usługi
  await Promise.all([
    prisma.service.create({ data: { name: "Wyprowadzanie psów" } }),
    prisma.service.create({ data: { name: "Opieka nad zwierzętami" } }),
    prisma.service.create({ data: { name: "Karmienie" } }),
  ]);

  // Dodaj statusy ogłoszeń
  await Promise.all([
    prisma.statusAdvertisement.create({ data: { name: "Active" } }),
    prisma.statusAdvertisement.create({ data: { name: "Inactive" } }),
    prisma.statusAdvertisement.create({ data: { name: "Paused" } }),
  ]);

  // Dodaj statusy archiwum
  await Promise.all([
    prisma.statusArchive.create({ data: { name: "Completed" } }),
    prisma.statusArchive.create({ data: { name: "Cancelled" } }),
  ]);

  console.log("Dane podstawowe zostały dodane!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
