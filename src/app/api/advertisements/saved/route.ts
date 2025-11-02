// src/app/api/advertisements/saved/route.ts
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
      city: {
        idCity: saved.Advertisement.Service_Provider.User.City.idCity,
        name: saved.Advertisement.Service_Provider.User.City.name,
        imageUrl: saved.Advertisement.Service_Provider.User.City.imageUrl,
      },
    }));

    // Update lastActive
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

/**
 * @swagger
 * /api/advertisements/saved:
 *   get:
 *     summary: Get all saved advertisements for the authenticated client
 *     description: |
 *       Returns all saved advertisements for the authenticated user (client).
 *       Includes title, startDate, endDate, serviceStartTime, serviceEndTime, keyImage (first image), and the service provider's city information for each advertisement.
 *       Requires a valid Firebase authentication token.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Saved advertisements retrieved successfully
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
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Profesjonalne wyprowadzanie psów w centrum Warszawy"
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-26T00:00:00Z"
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2025-11-25T00:00:00Z"
 *                       serviceStartTime:
 *                         type: string
 *                         nullable: true
 *                         example: "09:00"
 *                       serviceEndTime:
 *                         type: string
 *                         nullable: true
 *                         example: "17:00"
 *                       keyImage:
 *                         type: string
 *                         nullable: true
 *                         example: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500"
 *                       city:
 *                         type: object
 *                         properties:
 *                           idCity:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Warszawa"
 *                           imageUrl:
 *                             type: string
 *                             nullable: true
 *                             example: "https://example.com/city.jpg"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
