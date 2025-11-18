import { PrismaClient, Severity } from "@prisma/client";

const prisma = new PrismaClient();

const cities = [
  {
    name: "Warszawa",
    imageUrl:
      "https://polskapogodzinach.pl/wp-content/uploads/2023/11/warszawa-atrakcje-palac-kultury-i-nauki-w-warszawie.jpg",
  },
  {
    name: "Kraków",
    imageUrl:
      "https://polskapogodzinach.pl/wp-content/uploads/2023/07/atrakcje-krakowa-warto-zobaczyc-wzgorze-wawelskie.jpg",
  },
  {
    name: "Wrocław",
    imageUrl:
      "https://visitwroclaw.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/07/trasy-historyczne.jpg",
  },
  {
    name: "Poznań",
    imageUrl:
      "https://zzaoceanu.com/wp-content/uploads/2023/12/dreamstime_m_51535266.jpg",
  },
  {
    name: "Gdańsk",
    imageUrl:
      "https://rewapark.pl/wp-content/uploads/2023/02/gdansk-6-atrakcji-wartych-zobaczenia-w-gdansku-1.jpg",
  },
  {
    name: "Szczecin",
    imageUrl:
      "https://images.immediate.co.uk/production/volatile/sites/63/2024/08/szczecin-794fc03.jpeg",
  },
  {
    name: "Lublin",
    imageUrl: "https://meteor-turystyka.pl/images/places/0/101.jpg",
  },
  {
    name: "Radom",
    imageUrl:
      "https://www.visitradom.pl/wp-content/uploads/2021/11/Visit_Radom_Poznaj_Radom_stolica_Polski-1024x565.jpg",
  },
  {
    name: "Rzeszów",
    imageUrl:
      "https://podkarpackie.travel/storage/image/core_files/2022/2/15/bdec2c5016f1ed2550da1e1ff79cf59f/jpg/prot/preview/Bernardyni%20Rzeszów%20fot.%20K.%20Kłysewicz.jpg",
  },
  {
    name: "Zamość",
    imageUrl:
      "https://static.polskieszlaki.pl/zdjecia/turystyka/2023-11/1920_1080/zamosc-98.jpg",
  },
];

const services = [
  { name: "Wyprowadzanie psów" },
  { name: "Opieka nad zwierzętami w domu" },
  { name: "Boarding (opieka w domu opiekuna)" },
  { name: "Wizyty domowe" },
  { name: "Strzyżenie i pielęgnacja" },
  { name: "Szkolenie psów" },
];

const symptoms = [
  {
    code: "vomiting",
    name: "Wymioty",
    description: "Zwracanie treści pokarmowej.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "anorexia",
    name: "Brak apetytu",
    description: "Zmniejszone lub brak chęci do jedzenia.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "pruritus",
    name: "Swędzenie",
    description: "Intensywne swędzenie skóry.",
    defaultSeverity: "LOW" as Severity,
  },
  // ... (reszta symptomów bez zmian)
  {
    code: "painful_defecation",
    name: "Bolesna defekacja",
    description: "Ból podczas wypróżniania.",
    defaultSeverity: "HIGH" as Severity,
  },
];

const species = [
  "Pies",
  "Kot",
  "Chomik",
  "Królik",
  "Świnka morska",
  "Ptak",
  "Ryba",
  "Żółw",
  "Wąż",
  "Jaszczurka",
  "Iguana",
  "Fretka",
  "Mysz",
  "Szczur",
  "Papuga",
  "Małpa",
  "Inne",
];

async function main() {
  console.log("Seeding cities with images...");

  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { imageUrl: city.imageUrl },
      create: { name: city.name, imageUrl: city.imageUrl },
    });
    console.log(`City added or updated: ${city.name}`);
  }

  console.log("Seeding services...");

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: { name: service.name },
    });
    console.log(`Service added or updated: ${service.name}`);
  }

  console.log("Seeding symptoms...");

  for (const symptom of symptoms) {
    await prisma.symptom.upsert({
      where: { code: symptom.code },
      update: {},
      create: {
        code: symptom.code,
        name: symptom.name,
        description: symptom.description,
        defaultSeverity: symptom.defaultSeverity,
      },
    });
    console.log(`Symptom added or updated: ${symptom.name}`);
  }

  console.log("Seeding species...");

  for (const spieceName of species) {
    await prisma.spiece.upsert({
      where: { name: spieceName },
      update: {},
      create: { name: spieceName },
    });
    console.log(`Species added or updated: ${spieceName}`);
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
