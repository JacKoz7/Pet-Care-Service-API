// src/app/api/advertisements/route.ts
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
          where: {
            isActive: true,
          },
          include: {
            Advertisements: {
              select: {
                idAdvertisement: true,
                title: true,
                startDate: true,
                endDate: true,
                serviceStartTime: true,
                serviceEndTime: true,
                Images: {
                  select: {
                    imageUrl: true,
                  },
                  orderBy: {
                    order: "asc",
                  },
                  take: 1,
                },
              },
              where: {
                status: "ACTIVE",
              },
            },
          },
        },
        City: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.ServiceProviders.length === 0) {
      return NextResponse.json(
        { error: "User is not an active service provider" },
        { status: 403 }
      );
    }

    // Collect all advertisements from all active service providers (assuming typically one, but handling multiple)
    const advertisements = user.ServiceProviders.flatMap((sp) =>
      sp.Advertisements.map((ad) => ({
        id: ad.idAdvertisement,
        title: ad.title,
        startDate: ad.startDate,
        endDate: ad.endDate,
        serviceStartTime: ad.serviceStartTime ? ad.serviceStartTime.toTimeString().slice(0, 5) : null,
        serviceEndTime: ad.serviceEndTime ? ad.serviceEndTime.toTimeString().slice(0, 5) : null,
        keyImage: ad.Images[0]?.imageUrl || null,
        city: {
          idCity: user.City.idCity,
          name: user.City.name,
          imageUrl: user.City.imageUrl,
        },
      }))
    );

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
    console.error("Error fetching service provider advertisements:", error);
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
 * /api/advertisements:
 *   get:
 *     summary: Get all active advertisements
 *     description: |
 *       Returns all active advertisements in the system.
 *       Supports pagination via query parameters 'page' and 'limit'.
 *       Only returns title, startDate, endDate, serviceStartTime, serviceEndTime, keyImage (first image), and the service provider's city information for each advertisement.
 *     tags: [Advertisements]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Advertisements retrieved successfully
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       500:
 *         description: Internal server error
 */