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

/**
 * @swagger
 * /api/advertisements/archived:
 *   get:
 *     summary: Get user's archived advertisements
 *     description: |
 *       Returns a list of archived (deleted) advertisements for the authenticated user who is a service provider.
 *       Includes title, start date, end date, service hours, key image, species (always empty – not stored in archive), and city details.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved archived advertisements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 advertisements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       originalId:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       serviceStartTime:
 *                         type: string
 *                         nullable: true
 *                       serviceEndTime:
 *                         type: string
 *                         nullable: true
 *                       keyImage:
 *                         type: string
 *                         nullable: true
 *                       species:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: []
 *                       city:
 *                         type: object
 *                         properties:
 *                           idCity:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                             nullable: true
 */
