import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
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
          include: {
            Advertisements: {
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
                AdvertisementSpieces: {
                  select: {
                    spiece: {
                      select: {
                        idSpiece: true,
                        name: true,
                      },
                    },
                  },
                },
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

    // Collect all advertisements from all service providers
    const advertisements = user.ServiceProviders.flatMap((sp) =>
      sp.Advertisements.map((ad) => ({
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
        species: ad.AdvertisementSpieces.map((s) => ({
          id: s.spiece.idSpiece,
          name: s.spiece.name,
        })),
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      title,
      description,
      price,
      startDate,
      endDate,
      serviceStartTime,
      serviceEndTime,
      serviceId,
      images,
      speciesIds,
    } = body;

    // Basic validation
    if (
      !title ||
      !startDate ||
      !endDate ||
      !serviceId ||
      !Array.isArray(images) ||
      images.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields or no images provided" },
        { status: 400 }
      );
    }

    // Validate price
    if (price !== null && (typeof price !== "number" || price < 0)) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate speciesIds if provided
    if (speciesIds && !Array.isArray(speciesIds)) {
      return NextResponse.json(
        { error: "speciesIds must be an array" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        ServiceProviders: {
          where: { isActive: true },
        },
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

    // Assuming one active provider per user
    const serviceProviderId = user.ServiceProviders[0].idService_Provider;

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { idService: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Validate speciesIds exist if provided
    if (speciesIds && speciesIds.length > 0) {
      const existingSpecies = await prisma.spiece.count({
        where: {
          idSpiece: { in: speciesIds },
        },
      });
      if (existingSpecies !== speciesIds.length) {
        return NextResponse.json(
          { error: "One or more invalid species IDs" },
          { status: 400 }
        );
      }
    }

    // Create advertisement
    const advertisement = await prisma.advertisement.create({
      data: {
        title,
        description,
        price,
        status: "ACTIVE",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        serviceStartTime: serviceStartTime ? new Date(serviceStartTime) : null,
        serviceEndTime: serviceEndTime ? new Date(serviceEndTime) : null,
        Service_idService: serviceId,
        Service_Provider_idService_Provider: serviceProviderId,
        Images: {
          create: images,
        },
        AdvertisementSpieces: {
          create: (speciesIds || []).map((id: number) => ({
            spieceId: id,
          })),
        },
      },
      include: {
        Images: true,
        AdvertisementSpieces: {
          include: {
            spiece: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      advertisement,
    });
  } catch (error: unknown) {
    console.error("Error creating advertisement:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "An advertisement with this title already exists for your account",
        },
        { status: 409 }
      );
    }
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
 *     summary: Get all advertisements for the authenticated user
 *     description: |
 *       Returns all advertisements for the authenticated user associated with any of their service providers.
 *       Includes advertisements of all statuses. Only returns title, startDate, endDate, serviceStartTime, serviceEndTime, keyImage (first image), species, and the service provider's city information for each advertisement.
 *       Requires a valid Firebase authentication token.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
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
 *                       species:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Pies"
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
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new advertisement
 *     description: |
 *       Creates a new advertisement for the authenticated user who is an active service provider.
 *       Requires a valid Firebase authentication token.
 *       At least one image must be provided, and price must be a non-negative number if provided.
 *       speciesIds is optional array of species IDs.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startDate
 *               - endDate
 *               - serviceId
 *               - images
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Profesjonalne wyprowadzanie psów w centrum Warszawy"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Oferuję profesjonalne wyprowadzanie psów..."
 *               price:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 example: 25.0
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-26T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-25T00:00:00Z"
 *               serviceStartTime:
 *                 type: string
 *                 nullable: true
 *                 example: "1970-01-01T09:00:00Z"
 *               serviceEndTime:
 *                 type: string
 *                 nullable: true
 *                 example: "1970-01-01T17:00:00Z"
 *               serviceId:
 *                 type: integer
 *                 example: 1
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       example: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500"
 *                     order:
 *                       type: integer
 *                       example: 1
 *               speciesIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Advertisement created successfully
 *       400:
 *         description: Missing required fields, no images provided, or invalid price or speciesIds
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not an active service provider)
 *       404:
 *         description: User or service not found
 *       409:
 *         description: Conflict (advertisement with this title already exists for the user)
 *       500:
 *         description: Internal server error
 */
