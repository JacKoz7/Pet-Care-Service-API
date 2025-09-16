import { PrismaClient } from "@prisma/client";

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
    imageUrl: "https://visitwroclaw.eu/files/news/wroclaw-visit2.jpg",
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

async function main() {
  console.log("Dodaję miasta z obrazkami...");

  // Seed cities
  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { imageUrl: city.imageUrl },
      create: {
        name: city.name,
        imageUrl: city.imageUrl,
      },
    });
    console.log(`Dodano lub zaktualizowano miasto: ${city.name}`);
  }

  main()
    .catch((e) => {
      console.error("Błąd podczas seedowania:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
