// src/app/api/advertisements/latest/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const advertisements = await prisma.advertisement.findMany({
      where: {
        status: "ACTIVE",
      },
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
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    const mappedAdvertisements = advertisements.map((ad) => ({
      id: ad.idAdvertisement,
      title: ad.title,
      startDate: ad.startDate,
      endDate: ad.endDate,
      serviceStartTime: ad.serviceStartTime ? ad.serviceStartTime.toTimeString().slice(0, 5) : null,
      serviceEndTime: ad.serviceEndTime ? ad.serviceEndTime.toTimeString().slice(0, 5) : null,
      keyImage: ad.Images[0]?.imageUrl || null,
      city: {
        idCity: ad.Service_Provider.User.City.idCity,
        name: ad.Service_Provider.User.City.name,
        imageUrl: ad.Service_Provider.User.City.imageUrl,
      },
    }));

    return NextResponse.json({
      success: true,
      advertisements: mappedAdvertisements,
    });
  } catch (error) {
    console.error("Error fetching latest advertisements:", error);
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
 * /api/advertisements/latest:
 *   get:
 *     summary: Get 10 latest active advertisements
 *     description: |
 *       Returns the 10 most recently created active advertisements in the system.
 *       Only returns title, startDate, endDate, serviceStartTime, serviceEndTime, keyImage (first image), and the service provider's city information for each advertisement.
 *     tags: [Advertisements]
 *     responses:
 *       200:
 *         description: Latest advertisements retrieved successfully
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
 *       500:
 *         description: Internal server error
 */