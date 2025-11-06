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
  {
    code: "diarrhea",
    name: "Biegunka",
    description: "Luźne lub wodniste stolce.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "coughing",
    name: "Kaszel",
    description: "Suchy lub produktywny kaszel.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "sneezing",
    name: "Kichanie",
    description: "Powtarzające się kichanie.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "runny_nose",
    name: "Katar",
    description: "Wyciek z nosa.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "fever",
    name: "Gorączka",
    description: "Podwyższona temperatura ciała.",
    defaultSeverity: "HIGH" as Severity,
  },
  {
    code: "lethargy",
    name: "Letarg",
    description: "Osłabienie, brak energii.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "watery_eyes",
    name: "Łzawiące oczy",
    description: "Nadmierne łzawienie oczu.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "polydipsia",
    name: "Zwiększone pragnienie",
    description: "Nadmierne picie wody.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "polyuria",
    name: "Zwiększone oddawanie moczu",
    description: "Częstsze lub obfitsze oddawanie moczu.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "weight_loss",
    name: "Utrata wagi",
    description: "Niezamierzona utrata masy ciała.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "hair_loss",
    name: "Wypadanie sierści",
    description: "Utrata włosów lub sierści.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "seizures",
    name: "Napady padaczkowe",
    description: "Drgawki lub konwulsje.",
    defaultSeverity: "HIGH" as Severity,
  },
  {
    code: "lameness",
    name: "Kulawizna",
    description: "Chromanie lub trudności w chodzeniu.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "ear_discharge",
    name: "Wyciek z ucha",
    description: "Wydzielina z ucha.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "limping",
    name: "Kuleje",
    description: "Trudności w chodzeniu na jednej łapie.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "dehydration",
    name: "Odwodnienie",
    description: "Suchość dziąseł, brak elastyczności skóry.",
    defaultSeverity: "HIGH" as Severity,
  },
  {
    code: "bad_breath",
    name: "Zły oddech",
    description: "Nieprzyjemny zapach z pyska.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "drooling",
    name: "Nadmierne ślinienie",
    description: "Zwiększone ślinienie się.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "straining_defecation",
    name: "Parcie na stolec",
    description: "Trudności w defekacji.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "increased_appetite",
    name: "Zwiększony apetyt",
    description: "Nadmierny głód.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "hyperactivity",
    name: "Nadpobudliwość",
    description: "Nadmierna aktywność.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "weakness",
    name: "Słabość",
    description: "Ogólne osłabienie mięśni.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "runny_eyes",
    name: "Wyciek z oczu",
    description: "Kapiący wyciek z oczu.",
    defaultSeverity: "LOW" as Severity,
  },
  {
    code: "pot_belly",
    name: "Wydęty brzuch",
    description: "Opuchnięty lub powiększony brzuch.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "poor_growth",
    name: "Słaby wzrost",
    description: "Opóźniony rozwój u młodych zwierząt.",
    defaultSeverity: "MODERATE" as Severity,
  },
  {
    code: "dandruff",
    name: "Łupież",
    description: "Sucha, łuszcząca się skóra.",
    defaultSeverity: "LOW" as Severity,
  },
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
  "Aligator",
  "Małpa",
  "Inne"
];

async function main() {
  console.log("Dodaję miasta z obrazkami...");

  // Seed cities - upsert NIE usuwa, tylko aktualizuje lub tworzy
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

  // Seed services - upsert NIE usuwa, tylko aktualizuje lub tworzy
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

  console.log("Dodaję symptomy...");

  // Seed symptoms - upsert NIE usuwa, tylko aktualizuje lub tworzy
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
    console.log(`Dodano lub zaktualizowano symptom: ${symptom.name}`);
  }

  console.log("Sprawdzam czy istnieją ogłoszenia...");

  // Sprawdź czy są JAKIEKOLWIEK ogłoszenia - jeśli tak, NIE dodawaj nowych
  const existingAds = await prisma.advertisement.count();
  if (existingAds > 0) {
    console.log(
      `Znaleziono ${existingAds} ogłoszeń. Pomijam dodawanie przykładowych ogłoszeń.`
    );
  } else {
    console.log("Brak ogłoszeń. Sprawdzam service providerów...");

    // Sprawdź czy istnieją service providerzy o id 1
    const serviceProviders = await prisma.service_Provider.findMany({
      where: {
        idService_Provider: {
          in: [1],
        },
      },
    });

    if (serviceProviders.length === 0) {
      console.log(
        "Brak service providerów o id 1. Pomijam dodawanie ogłoszeń."
      );
      console.log(
        "Najpierw dodaj użytkowników i service providerów przez API."
      );
    } else {
      console.log(
        `Znaleziono ${serviceProviders.length} service providerów. Dodaję przykładowe ogłoszenia...`
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
                endDate: futureDate(60),
                serviceStartTime: new Date("1970-01-01T09:00:00"),
                serviceEndTime: new Date("1970-01-01T17:00:00"),
                images: [
                  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500",
                  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500",
                ],
              },
              {
                serviceProviderId: 1,
                serviceId: 2,
                title: "Opieka nad zwierzętami w domu",
                description:
                  "Kompleksowa opieka nad Twoim zwierzęciem w komfortowych warunkach jego własnego domu. Karmienie, spacery, zabawa i dużo uwagi.",
                price: 80.0,
                status: "ACTIVE" as const,
                startDate: now,
                endDate: futureDate(365),
                serviceStartTime: new Date("1970-01-01T08:00:00"),
                serviceEndTime: new Date("1970-01-01T20:00:00"),
                images: [
                  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500",
                ],
              },
              {
                serviceProviderId: 1,
                serviceId: 3,
                title: "Boarding - Twój pies jak w domu",
                description:
                  "Oferuję opiekę nad Twoim psem w moim domu. Duży ogród, dużo uwagi i miłości. Regularne spacery i zabawa z innymi psami pod nadzorem.",
                price: 60.0,
                status: "ACTIVE" as const,
                startDate: now,
                endDate: futureDate(90),
                serviceStartTime: new Date("1970-01-01T07:00:00"),
                serviceEndTime: new Date("1970-01-01T22:00:00"),
                images: [
                  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500",
                  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500",
                ],
              },
            ]
          : []),
      ];

      // Seed sample advertisements - tylko jeśli baza jest pusta
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
              serviceStartTime: ad.serviceStartTime,
              serviceEndTime: ad.serviceEndTime,
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
            `Dodano ogłoszenie: ${createdAd.title} z ${
              createdAd.Images.length
            } zdjęciami (aktywne do: ${
              createdAd.endDate || "bez limitu"
            }, godziny: ${createdAd.serviceStartTime
              ?.toTimeString()
              .slice(0, 5)} - ${createdAd.serviceEndTime
              ?.toTimeString()
              .slice(0, 5)})`
          );
        } catch (error) {
          console.error(`Błąd przy dodawaniu ogłoszenia "${ad.title}":`, error);
        }
      }
    }
  }

  console.log("Dodaję gatunki...");

  // Seed Spiece (gatunki) - upsert NIE usuwa
  for (const spieceName of species) {
    await prisma.spiece.upsert({
      where: { name: spieceName },
      update: {},
      create: {
        name: spieceName,
      },
    });
    console.log(`Dodano lub zaktualizowano gatunek: ${spieceName}`);
  }

  console.log("Sprawdzam czy istnieje user o id 1 i client...");

  // Sprawdź czy istnieje user o id 1
  const user = await prisma.user.findUnique({
    where: { idUser: 1 },
    include: { Clients: true },
  });

  if (!user) {
    console.log("Brak usera o id 1. Pomijam dodawanie petów.");
    console.log("Najpierw dodaj użytkownika przez API.");
  } else {
    // Znajdź lub utwórz client dla tego usera - NIE usuwa istniejącego
    let client = user.Clients[0];
    if (!client) {
      client = await prisma.client.create({
        data: {
          User_idUser: user.idUser,
        },
      });
      console.log(
        `Utworzono clienta o id: ${client.idClient} dla usera ${user.idUser}`
      );
    } else {
      console.log(
        `Znaleziono clienta o id: ${client.idClient} dla usera ${user.idUser}`
      );
    }

    console.log("Sprawdzam czy istnieją pety dla clienta...");

    // Sprawdź czy są jakiekolwiek pety - jeśli tak, NIE dodawaj nowych
    const existingPetsCount = await prisma.pet.count({
      where: { Client_idClient: client.idClient },
    });

    if (existingPetsCount > 0) {
      console.log(
        `Znaleziono ${existingPetsCount} petów dla clienta. Pomijam dodawanie nowych petów.`
      );
    } else {
      console.log("Dodaję przykładowe pety dla clienta...");

      const dogSpiece = await prisma.spiece.findFirst({
        where: { name: "Pies" },
      });

      if (!dogSpiece) {
        console.log("Brak gatunku 'Pies'. Pomijam dodawanie petów.");
        return;
      }

      // Sample pets data
      const samplePets = [
        {
          name: "Max",
          age: 5,
          description: "Lojalny i energiczny pies, uwielbia spacery.",
          spieceId: dogSpiece.idSpiece,
          clientId: client.idClient,
          images: [
            "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500",
          ],
        },
        {
          name: "Bella",
          age: 3,
          description: "Słodka suczka, spokojna i przyjazna.",
          spieceId: dogSpiece.idSpiece,
          clientId: client.idClient,
          images: [
            "https://warsawdog.com/wp-content/uploads/2021/06/labrador-retriever.jpg",
          ],
        },
      ];

      // Seed sample pets - tylko jeśli client nie ma żadnych petów
      for (const pet of samplePets) {
        try {
          const createdPet = await prisma.pet.create({
            data: {
              name: pet.name,
              age: pet.age,
              description: pet.description,
              Spiece_idSpiece: pet.spieceId,
              Client_idClient: pet.clientId,
              Images: {
                create: pet.images.map((imageUrl, index) => ({
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
            `Dodano peta: ${createdPet.name} (wiek: ${createdPet.age}, gatunek: Pies) z ${createdPet.Images.length} zdjęciami`
          );
        } catch (error) {
          console.error(`Błąd przy dodawaniu peta "${pet.name}":`, error);
        }
      }
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
