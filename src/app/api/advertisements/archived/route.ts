// archived advs - UPDATED TO INCLUDE species: string[]
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
        ServiceProviders: {
          select: {
            idService_Provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const serviceProviderIds = user.ServiceProviders.map(
      (sp) => sp.idService_Provider
    );

    if (serviceProviderIds.length === 0) {
      return NextResponse.json({ advertisements: [] });
    }

    const archivedAds = await prisma.advertisementArchive.findMany({
      where: {
        serviceProviderId: {
          in: serviceProviderIds,
        },
      },
      include: {
        Service: {
          select: {
            name: true,
          },
        },
        Service_Provider: {
          select: {
            User: {
              select: {
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
    });

    const formattedAds = archivedAds.map((ad) => {
      const images = Array.isArray(ad.imagesUrls)
        ? ad.imagesUrls
        : ad.imagesUrls
        ? JSON.parse(ad.imagesUrls as string)
        : [];
      const keyImage = images.length > 0 ? images[0].url : null;

      return {
        id: ad.idAdvertisementArchive,
        originalId: ad.originalAdvertisementId,
        title: ad.title,
        startDate: ad.startDate.toISOString(),
        endDate: ad.endDate ? ad.endDate.toISOString() : null,
        serviceStartTime: ad.serviceStartTime
          ? ad.serviceStartTime.toTimeString().slice(0, 5)
          : null,
        serviceEndTime: ad.serviceEndTime
          ? ad.serviceEndTime.toTimeString().slice(0, 5)
          : null,
        keyImage,
        species: [], // Species nie są zapisywane w archiwum – po restore będą puste
        city: {
          idCity: ad.Service_Provider.User.City.idCity,
          name: ad.Service_Provider.User.City.name,
          imageUrl: ad.Service_Provider.User.City.imageUrl,
        },
      };
    });

    return NextResponse.json({
      success: true,
      advertisements: formattedAds,
    });
  } catch (error) {
    console.error("Error fetching archived advertisements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}