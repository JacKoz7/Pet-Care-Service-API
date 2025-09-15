import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cities = [
  "Warszawa",
  "Kraków",
  "Łódź",
  "Wrocław",
  "Poznań",
  "Gdańsk",
  "Szczecin",
  "Bydgoszcz",
  "Lublin",
  "Białystok",
  "Katowice",
  "Gdynia",
  "Częstochowa",
  "Radom",
  "Sosnowiec",
  "Toruń",
  "Kielce",
  "Rzeszów",
  "Zamość",
  "Siedlce",
];

async function main() {
  console.log("Dodaję miasta...");

  for (const cityName of cities) {
    await prisma.city.upsert({
      where: { name: cityName }, // Sprawdzaj po nazwie
      update: {}, // Nic nie aktualizuj, jeśli istnieje
      create: { name: cityName }, // Stwórz, jeśli nie istnieje
    });
    console.log(`Dodano lub pominięto: ${cityName}`);
  }

  console.log("Gotowe!");
}

main()
  .catch((e) => {
    console.error("Błąd podczas seedowania:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
