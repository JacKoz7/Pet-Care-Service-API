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
    imageUrl: "https://visitwroclaw.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/07/trasy-historyczne.jpg",
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

  console.log("Dodaję usługi...");

  // Seed services
  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: {
        name: service.name,
      },
    });
    console.log(`Dodano lub zaktualizowano usługę: ${service.name}`);
  }

  console.log("Sprawdzam czy istnieją service providerzy...");

  // Sprawdź czy istnieją service providerzy o id 1, 2, 3
  const serviceProviders = await prisma.service_Provider.findMany({
    where: {
      idService_Provider: {
        in: [1, 2, 3],
      },
    },
  });

  if (serviceProviders.length === 0) {
    console.log(
      "Brak service providerów o id 1, 2, 3. Pomijam dodawanie ogłoszeń."
    );
    console.log("Najpierw dodaj użytkowników i service providerów przez API.");
    return;
  }

  console.log(
    `Znaleziono ${serviceProviders.length} service providerów. Dodaję ogłoszenia...`
  );

  // Helper function to create dates
  const now = new Date();
  const futureDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  };

  // Sample advertisements data with start/end dates
  const sampleAdvertisements = [
    // Service Provider 1 (jeśli istnieje)
    ...(serviceProviders.find((sp) => sp.idService_Provider === 1)
      ? [
          {
            serviceProviderId: 1,
            serviceId: 1,
            title: "Profesjonalne wyprowadzanie psów w centrum Warszawy",
            description:
              "Oferuję profesjonalne wyprowadzanie psów w centrum Warszawy. Mam 5 lat doświadczenia w opiece nad zwierzętami. Zapewniam bezpieczne i aktywne spacery dostosowane do potrzeb Twojego pupila.",
            price: 25.0,
            status: "ACTIVE" as const,
            startDate: now,
            endDate: futureDate(60), // Active for 60 days
            images: [
              "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500",
              "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500",
            ],
          },
          {
            serviceProviderId: 1,
            serviceId: 2,
            title: "Opieka nad zwierzętami w Twoim domu",
            description:
              "Kompleksowa opieka nad Twoim zwierzęciem w komfortowych warunkach jego własnego domu. Karmienie, spacery, zabawa i dużo uwagi.",
            price: 80.0,
            status: "ACTIVE" as const,
            startDate: now,
            endDate: null, // No expiration date
            images: [
              "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500",
            ],
          },
        ]
      : []),

    // Service Provider 2 (jeśli istnieje)
    ...(serviceProviders.find((sp) => sp.idService_Provider === 2)
      ? [
          {
            serviceProviderId: 2,
            serviceId: 3,
            title: "Boarding - Twój pies jak w domu",
            description:
              "Oferuję opiekę nad Twoim psem w moim domu. Duży ogród, dużo uwagi i miłości. Regularne spacery i zabawa z innymi psami pod nadzorem.",
            price: 60.0,
            status: "ACTIVE" as const,
            startDate: now,
            endDate: futureDate(90), // Active for 90 days
            images: [
              "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500",
              "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500",
            ],
          },
          {
            serviceProviderId: 2,
            serviceId: 1,
            title: "Spacery z psem w weekendy",
            description:
              "Weekendowe spacery z Twoim pupilem. Długie, aktywne wypady do parku lub lasu. Idealne dla właścicieli, którzy chcą dać swojemu psu więcej ruchu.",
            price: 35.0,
            status: "ACTIVE" as const,
            startDate: now,
            endDate: futureDate(30), // Active for 30 days
            images: [
              "https://images.unsplash.com/photo-1534361960057-19889db9621e?w=500",
            ],
          },
        ]
      : []),

    // Service Provider 3 (jeśli istnieje)
    ...(serviceProviders.find((sp) => sp.idService_Provider === 3)
      ? [
          {
            serviceProviderId: 3,
            serviceId: 5,
            title: "Profesjonalna pielęgnacja i strzyżenie",
            description:
              "Kompleksowa pielęgnacja Twojego pupila. Strzyżenie, kąpiel, obcinanie pazurów, czyszczenie uszu. Używam tylko wysokiej jakości kosmetyków.",
            price: 120.0,
            status: "ACTIVE" as const,
            startDate: now,
            endDate: futureDate(45), // Active for 45 days
            images: [
              "https://images.unsplash.com/photo-1559190394-df5a28aab5c5?w=500",
              "https://images.unsplash.com/photo-1570018144715-43110363d70a?w=500",
            ],
          },
          {
            serviceProviderId: 3,
            serviceId: 6,
            title: "Szkolenie psów - podstawowe komendy",
            description:
              "Szkolenie podstawowych komend dla szczeniąt i młodych psów. Naucz swojego pupila posłuszeństwa w przyjaznej atmosferze.",
            price: 150.0,
            status: "ACTIVE" as const,
            startDate: now,
            endDate: null, // No expiration date
            images: [
              "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500",
            ],
          },
        ]
      : []),
  ];

  // Seed sample advertisements
  for (const ad of sampleAdvertisements) {
    try {
      const createdAd = await prisma.advertisement.create({
        data: {
          title: ad.title,
          description: ad.description,
          price: ad.price,
          status: ad.status,
          startDate: ad.startDate,
          endDate: ad.endDate,
          Service_idService: ad.serviceId,
          Service_Provider_idService_Provider: ad.serviceProviderId,
          Images: {
            create: ad.images.map((imageUrl, index) => ({
              imageUrl,
              order: index + 1,
            })),
          },
        },
        include: {
          Images: true,
        },
      });
      console.log(
        `Dodano ogłoszenie: ${createdAd.title} z ${createdAd.Images.length} zdjęciami (aktywne do: ${createdAd.endDate || 'bez limitu'})`
      );
    } catch (error) {
      console.error(`Błąd przy dodawaniu ogłoszenia "${ad.title}":`, error);
    }
  }

  console.log("Seedowanie zakończone pomyślnie!");
}

main()
  .catch((e) => {
    console.error("Błąd podczas seedowania:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });