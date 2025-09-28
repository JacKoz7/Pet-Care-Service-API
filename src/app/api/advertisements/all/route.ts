// src/app/api/advertisements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/advertisements/all:
 *   get:
 *     summary: Get all active advertisements with filtering and pagination
 *     description: |
 *       Retrieves all active advertisements in the system, with optional filtering by title and city, and pagination.
 *       Returns title, startDate, endDate, serviceStartTime, serviceEndTime, keyImage (first image), and the service provider's city information for each advertisement.
 *       This endpoint is unprotected and accessible to all users.
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query to filter advertisements by title (case-insensitive)
 *         example: "Dog Walking"
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: integer
 *         description: Filter advertisements by city ID
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of advertisements per page (max 100)
 *         example: 10
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
 *                         example: "Professional Dog Walking in Warsaw"
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
 *                         example: "https://example.com/image.jpg"
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
 *                             example: "https://example.com/city.jpg"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Invalid page number or page size
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const cityId = searchParams.get("cityId") ? parseInt(searchParams.get("cityId")!) : null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "Invalid page size" }, { status: 400 });
    }

    // Build where clause for filtering with proper typing
    const where: Prisma.AdvertisementWhereInput = {
      status: "ACTIVE",
    };

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (cityId) {
      where.Service_Provider = {
        User: {
          City_idCity: cityId,
        },
      };
    }

    // Fetch total count for pagination
    const totalAds = await prisma.advertisement.count({ where });

    // Fetch advertisements with pagination
    const advertisements = await prisma.advertisement.findMany({
      where,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
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
      pagination: {
        page,
        pageSize,
        total: totalAds,
        totalPages: Math.ceil(totalAds / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}