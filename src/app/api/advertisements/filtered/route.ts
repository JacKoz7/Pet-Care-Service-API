import { NextRequest, NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/advertisements/filtered:
 *   get:
 *     summary: Get active advertisements with advanced backend filtering and pagination
 *     description: |
 *       Retrieves advertisements with server-side filtering capabilities.
 *       Use this endpoint when pagination must be consistent with applied filters.
 *       Supports filtering by price range, specific service, and species.
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for title (case-insensitive)
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: integer
 *         description: Filter by city ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *         example: 20.00
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *         example: 200.00
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: integer
 *         description: Filter by specific service ID
 *         example: 3
 *       - in: query
 *         name: species
 *         schema:
 *           type: string
 *         description: Comma-separated list of species names
 *         example: "Pies,Kot"
 *     responses:
 *       200:
 *         description: Filtered advertisements retrieved successfully
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
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: "Cat Sitting"
 *                       price:
 *                         type: number
 *                         nullable: true
 *                         example: 45.00
 *                       serviceId:
 *                         type: integer
 *                         example: 1
 *                       serviceName:
 *                         type: string
 *                         example: "Opieka"
 *                       keyImage:
 *                         type: string
 *                         nullable: true
 *                       species:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Kot"]
 *                       city:
 *                         type: object
 *                         properties:
 *                           idCity:
 *                             type: integer
 *                           name:
 *                             type: string
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
 *                       example: 5
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Invalid pagination parameters
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Standardowe parametry
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const cityId = searchParams.get("cityId") ? parseInt(searchParams.get("cityId")!) : null;

    // Dodatkowe filtry backendowe
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const serviceId = searchParams.get("serviceId") ? parseInt(searchParams.get("serviceId")!) : undefined;
    // species=Pies,Kot
    const speciesRaw = searchParams.get("species"); 

    // Walidacja paginacji
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "Invalid page size" }, { status: 400 });
    }

    // Budowanie where clause
    const where: Prisma.AdvertisementWhereInput = {
      status: "ACTIVE",
    };

    // 1. Wyszukiwanie tekstowe
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    // 2. Miasto
    if (cityId) {
      where.Service_Provider = { User: { City_idCity: cityId } };
    }

    // 3. Usługa
    if (serviceId) {
       where.Service = { idService: serviceId };
    }

    // 4. Cena (zakres)
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // 5. Gatunki (wiele-do-wielu)
    if (speciesRaw) {
      const speciesList = speciesRaw.split(",").map(s => s.trim());
      if (speciesList.length > 0) {
        where.AdvertisementSpieces = {
          some: {
            spiece: {
              name: { in: speciesList, mode: 'insensitive' }
            }
          }
        };
      }
    }

    // Count total with ALL filters applied
    const totalAds = await prisma.advertisement.count({ where });

    const advertisements = await prisma.advertisement.findMany({
      where,
      select: {
        idAdvertisement: true,
        title: true,
        price: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
        Service: {
          select: { idService: true, name: true },
        },
        Images: {
          select: { imageUrl: true },
          orderBy: { order: "asc" },
          take: 1,
        },
        AdvertisementSpieces: {
          select: {
            spiece: { select: { name: true } },
          },
        },
        Service_Provider: {
          select: {
            User: {
              select: {
                City: {
                  select: { idCity: true, name: true, imageUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
      advertisements: mappedAdvertisements,
      pagination: {
        page,
        pageSize,
        total: totalAds,
        totalPages: Math.ceil(totalAds / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching filtered advertisements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}