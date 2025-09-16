import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cities = [
  {
    name: "Warszawa",
    imageUrl:
      "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop",
  },
  {
    name: "Kraków",
    imageUrl:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
  },
  {
    name: "Wrocław",
    imageUrl:
      "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop",
  },
  {
    name: "Poznań",
    imageUrl:
      "https://images.unsplash.com/photo-1571104508999-893933ded431?w=800&h=600&fit=crop",
  },
  {
    name: "Gdańsk",
    imageUrl:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=600&fit=crop",
  },
  {
    name: "Szczecin",
    imageUrl:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop",
  },
  {
    name: "Lublin",
    imageUrl:
      "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop",
  },
  {
    name: "Radom",
    imageUrl:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop",
  },
  {
    name: "Rzeszów",
    imageUrl:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop",
  },
  {
    name: "Zamość",
    imageUrl:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
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

  console.log("Dodaję użytkownika admina...");

  // Seed admin user
  const adminUser = await prisma.user.upsert({
    where: { firebaseUid: "gDrvZrbz1xXe8JcqiBFjWrIUHvm1" },
    update: {
      email: "ilovesteroids5@gmail.com",
      firstName: "Jan", // Example first name
      lastName: "Kowalski", // Example last name
      phoneNumber: "123456789", // Example phone number
      isEmailVerified: true, // Assume email is verified for admin
      lastActive: new Date(), // Current timestamp
      City: {
        connect: { name: "Warszawa" }, // Connect to an existing city
      },
    },
    create: {
      firebaseUid: "gDrvZrbz1xXe8JcqiBFjWrIUHvm1",
      email: "ilovesteroids5@gmail.com",
      firstName: "Jan",
      lastName: "Kowalski",
      phoneNumber: "123456789",
      isEmailVerified: true,
      lastActive: new Date(),
      City: {
        connect: { name: "Warszawa" }, // Connect to Warszawa
      },
    },
  });

  // Ensure the user is an admin
  await prisma.admin.upsert({
    where: { User_idUser: adminUser.idUser },
    update: {},
    create: {
      User: {
        connect: { idUser: adminUser.idUser },
      },
    },
  });

  console.log(
    `Dodano lub zaktualizowano użytkownika admina: ${adminUser.email}`
  );
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
