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
        { error: "To manage your advertisements you must be service provider (now they are inactive)" },
        { status: 403 }
      );
    }

    // Collect all advertisements from all active service providers
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
      },
      include: {
        Images: true,
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

export async function PUT(request: NextRequest) {
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
      idAdvertisement,
      title,
      description,
      price,
      startDate,
      endDate,
      serviceStartTime,
      serviceEndTime,
      serviceId,
      images,
    } = body;

    // Basic validation
    if (
      !idAdvertisement ||
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        ServiceProviders: {
          where: { isActive: true },
          select: { idService_Provider: true },
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

    const serviceProviderId = user.ServiceProviders[0].idService_Provider;

    // Check if advertisement exists and belongs to the user
    const advertisement = await prisma.advertisement.findUnique({
      where: { idAdvertisement },
      include: { Images: true },
    });
    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }
    if (
      advertisement.Service_Provider_idService_Provider !== serviceProviderId
    ) {
      return NextResponse.json(
        { error: "You are not authorized to edit this advertisement" },
        { status: 403 }
      );
    }

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { idService: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Update advertisement
    const updatedAdvertisement = await prisma.advertisement.update({
      where: { idAdvertisement },
      data: {
        title,
        description,
        price,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        serviceStartTime: serviceStartTime ? new Date(serviceStartTime) : null,
        serviceEndTime: serviceEndTime ? new Date(serviceEndTime) : null,
        Service_idService: serviceId,
        Service_Provider_idService_Provider: serviceProviderId,
        Images: {
          // Delete existing images and create new ones
          deleteMany: {},
          create: images,
        },
      },
      include: {
        Images: true,
      },
    });

    return NextResponse.json({
      success: true,
      advertisement: updatedAdvertisement,
    });
  } catch (error: unknown) {
    console.error("Error updating advertisement:", error);
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
 *     summary: Get all active advertisements for the authenticated user
 *     description: |
 *       Returns all active advertisements for the authenticated user who is an active service provider.
 *       Only returns title, startDate, endDate, serviceStartTime, serviceEndTime, keyImage (first image), and the service provider's city information for each advertisement.
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
 *       403:
 *         description: Forbidden (user is not an active service provider)
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
 *     responses:
 *       200:
 *         description: Advertisement created successfully
 *       400:
 *         description: Missing required fields, no images provided, or invalid price
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
 *   put:
 *     summary: Update an existing advertisement
 *     description: |
 *       Updates an existing advertisement for the authenticated user who is an active service provider and owns the advertisement.
 *       Requires a valid Firebase authentication token.
 *       At least one image must be provided, and price must be a non-negative number if provided.
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
 *               - idAdvertisement
 *               - title
 *               - startDate
 *               - endDate
 *               - serviceId
 *               - images
 *             properties:
 *               idAdvertisement:
 *                 type: integer
 *                 example: 1
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
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 advertisement:
 *                   type: object
 *                   properties:
 *                     idAdvertisement:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Profesjonalne wyprowadzanie psów w centrum Warszawy"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "Oferuję profesjonalne wyprowadzanie psów..."
 *                     price:
 *                       type: number
 *                       nullable: true
 *                       example: 25.0
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-26T00:00:00Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-25T00:00:00Z"
 *                     serviceStartTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "1970-01-01T09:00:00Z"
 *                     serviceEndTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "1970-01-01T17:00:00Z"
 *                     Service_idService:
 *                       type: integer
 *                       example: 1
 *                     Service_Provider_idService_Provider:
 *                       type: integer
 *                       example: 1
 *                     Images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           idAdvertisementImage:
 *                             type: integer
 *                             example: 1
 *                           imageUrl:
 *                             type: string
 *                             example: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500"
 *                           order:
 *                             type: integer
 *                             example: 1
 *                           Advertisement_idAdvertisement:
 *                             type: integer
 *                             example: 1
 *       400:
 *         description: Missing required fields, no images provided, or invalid price
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not an active service provider or does not own the advertisement)
 *       404:
 *         description: User, service, or advertisement not found
 *       409:
 *         description: Conflict (advertisement with this title already exists for the user)
 *       500:
 *         description: Internal server error
 */
