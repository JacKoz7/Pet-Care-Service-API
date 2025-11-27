import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const archiveId = parseInt(id);

    if (isNaN(archiveId)) {
      return NextResponse.json(
        { error: "Invalid archive ID" },
        { status: 400 }
      );
    }

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
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.ServiceProviders.length === 0) {
      return NextResponse.json(
        { error: "User is not a service provider" },
        { status: 403 }
      );
    }

    const archivedAd = await prisma.advertisementArchive.findUnique({
      where: {
        idAdvertisementArchive: archiveId,
      },
      select: {
        idAdvertisementArchive: true,
        originalAdvertisementId: true,
        title: true,
        description: true,
        price: true,
        status: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
        serviceId: true,
        serviceProviderId: true,
        imagesUrls: true,
      },
    });

    if (!archivedAd) {
      return NextResponse.json(
        { error: "Archived advertisement not found" },
        { status: 404 }
      );
    }

    const isOwner = user.ServiceProviders.some(
      (sp) => sp.idService_Provider === archivedAd.serviceProviderId
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to restore this advertisement" },
        { status: 403 }
      );
    }

    const isActiveServiceProvider = user.ServiceProviders.some(
      (sp) =>
        sp.idService_Provider === archivedAd.serviceProviderId && sp.isActive
    );

    if (!isActiveServiceProvider) {
      return NextResponse.json(
        {
          error:
            "You must be an active service provider to restore this advertisement",
        },
        { status: 403 }
      );
    }

    // Validate title uniqueness
    const existingAd = await prisma.advertisement.findFirst({
      where: {
        title: archivedAd.title,
        Service_Provider_idService_Provider: archivedAd.serviceProviderId,
      },
    });

    if (existingAd) {
      return NextResponse.json(
        {
          error:
            "An advertisement with this title already exists for this service provider",
        },
        { status: 400 }
      );
    }

    // Parse imagesUrls
    const images = Array.isArray(archivedAd.imagesUrls)
      ? archivedAd.imagesUrls
      : archivedAd.imagesUrls
      ? JSON.parse(archivedAd.imagesUrls as string)
      : [];

    const restoredAd = await prisma.$transaction(async (tx) => {
      const newAd = await tx.advertisement.create({
        data: {
          title: archivedAd.title,
          description: archivedAd.description,
          price: archivedAd.price,
          status: archivedAd.status,
          startDate: archivedAd.startDate,
          endDate: archivedAd.endDate,
          serviceStartTime: archivedAd.serviceStartTime,
          serviceEndTime: archivedAd.serviceEndTime,
          Service_idService: archivedAd.serviceId,
          Service_Provider_idService_Provider: archivedAd.serviceProviderId,
          createdAt: new Date(),
        },
      });

      if (images.length > 0) {
        await tx.advertisementImage.createMany({
          data: images.map((img: { url: string; order: number }) => ({
            imageUrl: img.url,
            order: img.order,
            Advertisement_idAdvertisement: newAd.idAdvertisement,
          })),
        });
      }

      await tx.advertisementArchive.delete({
        where: {
          idAdvertisementArchive: archiveId,
        },
      });

      return newAd;
    });

    return NextResponse.json({
      success: true,
      advertisementId: restoredAd.idAdvertisement,
      note: "Species nie zostały przywrócone – nie są zapisywane w archiwum",
    });
  } catch (error) {
    console.error("Error restoring advertisement:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error:
              "An advertisement with this title already exists for this service provider",
          },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}