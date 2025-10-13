import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get an advertisement by ID
 *     description: Retrieves detailed information about a specific advertisement, including title, description, price, status, dates, service provider details, city, service name, and images.
 *     tags: [Advertisements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the advertisement to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved the advertisement
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
 *                     id:
 *                       type: integer
 *                       description: The ID of the advertisement
 *                       example: 1
 *                     title:
 *                       type: string
 *                       description: The title of the advertisement
 *                       example: "Professional Dog Walking"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: The description of the advertisement
 *                       example: "Daily dog walking services in Warsaw"
 *                     price:
 *                       type: number
 *                       nullable: true
 *                       description: The price of the service
 *                       example: 50.0
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE, PENDING, BOOKED]
 *                       description: The status of the advertisement
 *                       example: ACTIVE
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: The start date of the advertisement
 *                       example: "2025-09-26T00:00:00Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: The end date of the advertisement
 *                       example: "2025-11-25T00:00:00Z"
 *                     serviceStartTime:
 *                       type: string
 *                       nullable: true
 *                       description: The start time of the service (HH:mm format)
 *                       example: "09:00"
 *                     serviceEndTime:
 *                       type: string
 *                       nullable: true
 *                       description: The end time of the service (HH:mm format)
 *                       example: "17:00"
 *                     serviceProviderId:
 *                       type: integer
 *                       description: The ID of the service provider
 *                       example: 1
 *                     service:
 *                       type: string
 *                       description: The name of the service
 *                       example: "Dog Walking"
 *                     provider:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                           nullable: true
 *                           description: The first name of the service provider
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           nullable: true
 *                           description: The last name of the service provider
 *                           example: "Doe"
 *                         phoneNumber:
 *                           type: string
 *                           nullable: true
 *                           description: The phone number of the service provider
 *                           example: "123456789"
 *                     city:
 *                       type: object
 *                       properties:
 *                         idCity:
 *                           type: integer
 *                           description: The ID of the city
 *                           example: 1
 *                         name:
 *                           type: string
 *                           description: The name of the city
 *                           example: "Warsaw"
 *                         imageUrl:
 *                           type: string
 *                           nullable: true
 *                           description: The URL of the city image
 *                           example: "https://example.com/city.jpg"
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           imageUrl:
 *                             type: string
 *                             description: The URL of the advertisement image
 *                             example: "https://example.com/image.jpg"
 *                           order:
 *                             type: integer
 *                             nullable: true
 *                             description: The order of the image
 *                             example: 1
 *       400:
 *         description: Invalid advertisement ID
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: idNum,
      },
      select: {
        idAdvertisement: true,
        title: true,
        description: true,
        price: true,
        status: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
        Service_Provider: {
          select: {
            idService_Provider: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                City: true,
              },
            },
          },
        },
        Images: {
          select: {
            imageUrl: true,
            order: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        Service: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      advertisement: {
        id: advertisement.idAdvertisement,
        title: advertisement.title,
        description: advertisement.description,
        price: advertisement.price,
        status: advertisement.status,
        startDate: advertisement.startDate,
        endDate: advertisement.endDate,
        serviceStartTime: advertisement.serviceStartTime
          ? advertisement.serviceStartTime.toTimeString().slice(0, 5)
          : null,
        serviceEndTime: advertisement.serviceEndTime
          ? advertisement.serviceEndTime.toTimeString().slice(0, 5)
          : null,
        serviceProviderId: advertisement.Service_Provider.idService_Provider,
        service: advertisement.Service.name,
        provider: {
          firstName: advertisement.Service_Provider.User.firstName,
          lastName: advertisement.Service_Provider.User.lastName,
          phoneNumber: advertisement.Service_Provider.User.phoneNumber,
        },
        city: {
          idCity: advertisement.Service_Provider.User.City.idCity,
          name: advertisement.Service_Provider.User.City.name,
          imageUrl: advertisement.Service_Provider.User.City.imageUrl,
        },
        images: advertisement.Images.map((img) => ({
          imageUrl: img.imageUrl,
          order: img.order,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching advertisement by ID:", error);
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
 * /api/advertisements/{id}:
 *   put:
 *     summary: Update an advertisement
 *     description: |
 *       Updates an existing advertisement owned by the authenticated service provider.
 *       Supports updating title, description, price, status, dates, service times, service ID, and images.
 *       If `checkPermissions` is true in the request body, it verifies permissions without updating.
 *       Only the advertisement owner (matching service provider) can update, and the service provider must be active.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the advertisement to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkPermissions:
 *                 type: boolean
 *                 description: If true, checks permissions without updating the advertisement
 *                 example: false
 *               title:
 *                 type: string
 *                 description: The updated title of the advertisement
 *                 example: "Updated Dog Walking Service"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: The updated description of the advertisement
 *                 example: "Updated daily dog walking services in Warsaw"
 *               price:
 *                 type: number
 *                 nullable: true
 *                 description: The updated price of the service
 *                 example: 60.0
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 description: The updated status of the advertisement
 *                 example: ACTIVE
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: The updated start date of the advertisement
 *                 example: "2025-09-26T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: The updated end date of the advertisement
 *                 example: "2025-11-25T00:00:00Z"
 *               serviceStartTime:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: The updated start time of the service
 *                 example: "2025-09-26T09:00:00Z"
 *               serviceEndTime:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: The updated end time of the service
 *                 example: "2025-09-26T17:00:00Z"
 *               serviceId:
 *                 type: integer
 *                 description: The ID of the service
 *                 example: 1
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       description: The URL of the advertisement image
 *                       example: "https://example.com/new-image.jpg"
 *                     order:
 *                       type: integer
 *                       nullable: true
 *                       description: The order of the image
 *                       example: 1
 *     responses:
 *       200:
 *         description: Successfully updated the advertisement or verified permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid advertisement ID or invalid status value
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       403:
 *         description: User is not a service provider, not the owner, or not an active service provider
 *       404:
 *         description: User or advertisement not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

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
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.ServiceProviders.length === 0) {
      return NextResponse.json(
        { error: "User is not a service provider" },
        { status: 403 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: idNum,
      },
      select: {
        Service_Provider_idService_Provider: true,
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    const isOwner = user.ServiceProviders.some(
      (sp) =>
        sp.idService_Provider ===
        advertisement.Service_Provider_idService_Provider
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to update this advertisement" },
        { status: 403 }
      );
    }

    const isActiveServiceProvider = user.ServiceProviders.some(
      (sp) =>
        sp.idService_Provider ===
          advertisement.Service_Provider_idService_Provider && sp.isActive
    );

    if (!isActiveServiceProvider) {
      return NextResponse.json(
        {
          error:
            "You must be an active service provider to update this advertisement",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.checkPermissions) {
      return NextResponse.json({ success: true });
    }

    if (body.status && !["ACTIVE", "INACTIVE"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.advertisementImage.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });

      if (body.images && Array.isArray(body.images)) {
        for (const img of body.images) {
          await tx.advertisementImage.create({
            data: {
              imageUrl: img.imageUrl,
              order: img.order,
              Advertisement_idAdvertisement: idNum,
            },
          });
        }
      }

      await tx.advertisement.update({
        where: {
          idAdvertisement: idNum,
        },
        data: {
          title: body.title,
          description: body.description,
          price: body.price,
          status: body.status,
          startDate: body.startDate,
          endDate: body.endDate,
          serviceStartTime: body.serviceStartTime
            ? new Date(body.serviceStartTime)
            : null,
          serviceEndTime: body.serviceEndTime
            ? new Date(body.serviceEndTime)
            : null,
          Service_idService: body.serviceId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating advertisement:", error);
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
 * /api/advertisements/{id}:
 *   delete:
 *     summary: Delete an advertisement
 *     description: |
 *       Archives an advertisement by moving it to the AdvertisementArchive table and deletes it from the Advertisement table.
 *       Also deletes associated images from Firebase Storage, feedback, and archive records.
 *       Only the advertisement owner (matching service provider) can delete the advertisement.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the advertisement to delete
 *     responses:
 *       200:
 *         description: Successfully deleted the advertisement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid advertisement ID
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       403:
 *         description: User is not a service provider or not the owner
 *       404:
 *         description: User or advertisement not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

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
        ServiceProviders: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.ServiceProviders.length === 0) {
      return NextResponse.json(
        { error: "User has no service provider association" },
        { status: 403 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: idNum,
      },
      select: {
        idAdvertisement: true,
        title: true,
        description: true,
        price: true,
        status: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
        Service_idService: true,
        Service_Provider_idService_Provider: true,
        createdAt: true,
        Images: {
          select: {
            imageUrl: true,
            order: true,
          },
        },
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    const isOwner = user.ServiceProviders.some(
      (sp) =>
        sp.idService_Provider ===
        advertisement.Service_Provider_idService_Provider
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to delete this advertisement" },
        { status: 403 }
      );
    }

    const imagesUrls = advertisement.Images.map((img) => ({
      url: img.imageUrl,
      order: img.order,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.advertisementArchive.create({
        data: {
          originalAdvertisementId: advertisement.idAdvertisement,
          title: advertisement.title,
          description: advertisement.description,
          price: advertisement.price,
          status: advertisement.status,
          startDate: advertisement.startDate,
          endDate: advertisement.endDate,
          createdAt: advertisement.createdAt,
          serviceStartTime: advertisement.serviceStartTime,
          serviceEndTime: advertisement.serviceEndTime,
          serviceId: advertisement.Service_idService,
          serviceProviderId: advertisement.Service_Provider_idService_Provider,
          imagesUrls: imagesUrls.length > 0 ? imagesUrls : Prisma.JsonNull,
        },
      });

      await tx.advertisementImage.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.feedback.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.archive.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.advertisement.delete({
        where: {
          idAdvertisement: idNum,
        },
      });
    });

    // Delete images from Firebase Storage
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.error("FIREBASE_STORAGE_BUCKET env var not set");
      return NextResponse.json({ success: true }); // Proceed without deleting images if env missing
    }
    const bucket = getStorage().bucket(bucketName);
    for (const img of imagesUrls) {
      if (img.url) {
        const path = decodeURIComponent(
          img.url.split("/o/")[1]?.split("?")[0] || ""
        );
        if (path) {
          try {
            await bucket.file(path).delete();
            console.log(`Deleted image from Storage: ${path}`);
          } catch (deleteErr) {
            console.error(`Failed to delete image ${path}:`, deleteErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error archiving and deleting advertisement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
