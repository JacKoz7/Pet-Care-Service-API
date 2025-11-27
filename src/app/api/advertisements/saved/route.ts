// src/app/api/advertisements/saved/route.ts - UPDATED WITH species: string[]
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing or invalid" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        Clients: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.Clients.length === 0) {
      return NextResponse.json({
        success: true,
        advertisements: [],
      });
    }

    const clientId = user.Clients[0].idClient;

    const savedAds = await prisma.savedAdvertisement.findMany({
      where: { Client_idClient: clientId },
      include: {
        Advertisement: {
          select: {
            idAdvertisement: true,
            title: true,
            startDate: true,
            endDate: true,
            serviceStartTime: true,
            serviceEndTime: true,
            status: true,
            Images: {
              select: {
                imageUrl: true,
              },
              orderBy: {
                order: "asc",
              },
              take: 1,
            },
            AdvertisementSpieces: {
              select: {
                spiece: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            Service_Provider: {
              select: {
                User: {
                  select: {
                    City: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const advertisements = savedAds.map((saved) => ({
      id: saved.Advertisement.idAdvertisement,
      title: saved.Advertisement.title,
      startDate: saved.Advertisement.startDate,
      endDate: saved.Advertisement.endDate,
      serviceStartTime: saved.Advertisement.serviceStartTime
        ? saved.Advertisement.serviceStartTime.toTimeString().slice(0, 5)
        : null,
      serviceEndTime: saved.Advertisement.serviceEndTime
        ? saved.Advertisement.serviceEndTime.toTimeString().slice(0, 5)
        : null,
      keyImage: saved.Advertisement.Images[0]?.imageUrl || null,
      species: saved.Advertisement.AdvertisementSpieces.map(
        (s) => s.spiece.name
      ),
      city: {
        idCity: saved.Advertisement.Service_Provider.User.City.idCity,
        name: saved.Advertisement.Service_Provider.User.City.name,
        imageUrl: saved.Advertisement.Service_Provider.User.City.imageUrl,
      },
    }));

    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      advertisements,
    });
  } catch (error) {
    console.error("Error fetching saved advertisements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}