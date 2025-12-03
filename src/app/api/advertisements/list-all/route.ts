import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const now = new Date();

    const advertisements = await prisma.advertisement.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: now }, 
      },
      include: {
        Service: {
          select: {
            idService: true,
            name: true,
          },
        },
        Images: {
          select: { imageUrl: true },
          orderBy: { order: "asc" },
          take: 1,
        },
        AdvertisementSpieces: {
          include: {
            spiece: {
              select: { name: true },
            },
          },
        },
        Service_Provider: {
          include: {
            User: {
              include: {
                City: {
                  select: {
                    idCity: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedAdvertisements = advertisements.map((ad) => ({
      id: ad.idAdvertisement,
      title: ad.title,
      price: ad.price,
      serviceId: ad.Service.idService,
      serviceName: ad.Service.name,
      startDate: ad.startDate,
      endDate: ad.endDate,
      serviceStartTime: ad.serviceStartTime
        ? ad.serviceStartTime.toTimeString().slice(0, 5)
        : null,
      serviceEndTime: ad.serviceEndTime
        ? ad.serviceEndTime.toTimeString().slice(0, 5)
        : null,
      keyImage: ad.Images[0]?.imageUrl || null,
      species: ad.AdvertisementSpieces.map((s) => s.spiece.name),
      city: {
        idCity: ad.Service_Provider.User.City.idCity,
        name: ad.Service_Provider.User.City.name,
        imageUrl: ad.Service_Provider.User.City.imageUrl,
      },
    }));

    return NextResponse.json({
      success: true,
      count: mappedAdvertisements.length,
      advertisements: mappedAdvertisements,
    });
  } catch (error) {
    console.error("Error fetching all advertisements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
