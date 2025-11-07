// src/app/api/advertisements/latest/route.ts - UPDATED WITH species: string[]
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
 *       Returns the 10 most recently created active advertisements.
 *       Includes species as array of names.
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
 *                         example: ["Pies", "Kot"]
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
