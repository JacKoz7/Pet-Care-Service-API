import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/advertisements/list-all:
 *   get:
 *     summary: Get ALL active advertisements
 *     description: |
 *       Retrieves a flat list of all active advertisements in the system.
 *       No filtering, no pagination - just everything.
 *       All filtering happens on the frontend.
 *     tags: [Advertisements]
 *     responses:
 *       200:
 *         description: Full list of advertisements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Total number of items returned
 *                   example: 42
 *                 advertisements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: "Professional Dog Walking"
 *                       price:
 *                         type: number
 *                         nullable: true
 *                         example: 50.00
 *                       serviceId:
 *                         type: integer
 *                         example: 2
 *                       serviceName:
 *                         type: string
 *                         example: "Spacer"
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-01T00:00:00Z"
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2025-12-31T00:00:00Z"
 *                       serviceStartTime:
 *                         type: string
 *                         nullable: true
 *                         example: "08:00"
 *                       serviceEndTime:
 *                         type: string
 *                         nullable: true
 *                         example: "16:00"
 *                       keyImage:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/img.jpg"
 *                       species:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Pies", "Kot"]
 *                       city:
 *                         type: object
 *                         properties:
 *                           idCity:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Warsaw"
 *                           imageUrl:
 *                             type: string
 *                             nullable: true
 *                             example: "https://example.com/waw.jpg"
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const advertisements = await prisma.advertisement.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        idAdvertisement: true,
        title: true,
        price: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
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
          select: {
            spiece: {
              select: { name: true },
            },
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
