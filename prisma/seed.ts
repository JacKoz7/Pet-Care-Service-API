import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cities = [
  {
    name: "Warszawa",
    imageUrl: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop"
  },
  {
    name: "Kraków",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop"
  },
  {
    name: "Łódź",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop"
  },
  {
    name: "Wrocław",
    imageUrl: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop"
  },
  {
    name: "Poznań",
    imageUrl: "https://images.unsplash.com/photo-1571104508999-893933ded431?w=800&h=600&fit=crop"
  },
  {
    name: "Gdańsk",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=600&fit=crop"
  },
  {
    name: "Szczecin",
    imageUrl: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop"
  },
  {
    name: "Bydgoszcz",
    imageUrl: "https://images.unsplash.com/photo-1571104508999-893933ded431?w=800&h=600&fit=crop"
  },
  {
    name: "Lublin",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop"
  },
  {
    name: "Białystok",
    imageUrl: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop"
  },
  {
    name: "Katowice",
    imageUrl: "https://images.unsplash.com/photo-1571104508999-893933ded431?w=800&h=600&fit=crop"
  },
  {
    name: "Gdynia",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=600&fit=crop"
  },
  {
    name: "Częstochowa",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop"
  },
  {
    name: "Radom",
    imageUrl: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop"
  },
  {
    name: "Sosnowiec",
    imageUrl: "https://images.unsplash.com/photo-1571104508999-893933ded431?w=800&h=600&fit=crop"
  },
  {
    name: "Toruń",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop"
  },
  {
    name: "Kielce",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop"
  },
  {
    name: "Rzeszów",
    imageUrl: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop"
  },
  {
    name: "Zamość",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop"
  },
  {
    name: "Siedlce",
    imageUrl: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop"
  }
];

async function main() {
  console.log("Dodaję miasta z obrazkami...");
  
  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { imageUrl: city.imageUrl }, 
      create: { 
        name: city.name,
        imageUrl: city.imageUrl 
      },
    });
    console.log(`Dodano lub zaktualizowano: ${city.name}`);
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