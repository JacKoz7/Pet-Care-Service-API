// src/app/api/advertisements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma, StatusAdvertisement } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

const prisma = new PrismaClient();

function extractPathFromSignedUrl(url: string): string | null {
  try {
    // Match the pattern: https://storage.googleapis.com/{bucket}/{path}?params
    const match = url.match(
      /https:\/\/storage\.googleapis\.com\/[^\/]+\/(.+?)\?/
    );
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (error) {
    console.error("Error extracting path from URL:", error);
    return null;
  }
}

/**
 * @swagger
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get an advertisement by ID
 *     description: Retrieves detailed information about a specific advertisement, including title, description, price, status, dates, service provider details (with profile picture), city, service name, images, and species.
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
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Professional Dog Walking"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "Daily dog walking services in Warsaw"
 *                     price:
 *                       type: number
 *                       nullable: true
 *                       example: 50.0
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE, PENDING, BOOKED]
 *                       example: ACTIVE
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
 *                       nullable: true
 *                       example: "09:00"
 *                     serviceEndTime:
 *                       type: string
 *                       nullable: true
 *                       example: "17:00"
 *                     serviceProviderId:
 *                       type: integer
 *                       example: 1
 *                     service:
 *                       type: string
 *                       example: "Dog Walking"
 *                     provider:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                           nullable: true
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           nullable: true
 *                           example: "Doe"
 *                         phoneNumber:
 *                           type: string
 *                           nullable: true
 *                           example: "123456789"
 *                         profilePictureUrl:                # ← NOWE POLE
 *                           type: string
 *                           nullable: true
 *                           description: URL zdjęcia profilowego service providera
 *                           example: "https://storage.googleapis.com/your-bucket/users/abc123/profile.jpg"
 *                         averageRating:
 *                           type: number
 *                           example: 4.5
 *                         totalReviews:
 *                           type: integer
 *                           example: 10
 *                     city:
 *                       type: object
 *                       properties:
 *                         idCity:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Warsaw"
 *                         imageUrl:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/city.jpg"
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           imageUrl:
 *                             type: string
 *                             example: "https://example.com/image.jpg"
 *                           order:
 *                             type: integer
 *                             nullable: true
 *                             example: 1
 *                     species:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Pies"
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
                profilePictureUrl: true, // ← DODANE!
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
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    const reviewsAggregate = await prisma.review.aggregate({
      where: {
        Service_Provider_idService_Provider:
          advertisement.Service_Provider.idService_Provider,
      },
      _avg: { rating: true },
      _count: { idReview: true },
    });

    const averageRating = reviewsAggregate._avg.rating || 0;
    const totalReviews = reviewsAggregate._count.idReview;

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
          profilePictureUrl:
            advertisement.Service_Provider.User.profilePictureUrl, // ← ZWRACANE!
          averageRating,
          totalReviews,
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
        species: advertisement.AdvertisementSpieces.map((s) => ({
          id: s.spiece.idSpiece,
          name: s.spiece.name,
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
 *       Supports updating title, description, price, status, dates, service times, service ID, images, and speciesIds.
 *       Only the advertisement owner (matching service provider) can update, and the service provider must be active.
 *       Images are handled via multipart/form-data: keepImageUrls (JSON array of URLs to keep), newImages (new files).
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
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
 *                 type: string
 *                 nullable: true
 *                 description: The updated price of the service
 *                 example: "60.0"
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
 *               keepImageUrls:
 *                 type: string
 *                 description: JSON array of existing image URLs to keep
 *                 example: '["https://example.com/old-image.jpg"]'
 *               newImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               speciesIds:
 *                 type: string
 *                 description: JSON array of species IDs
 *                 example: "[1, 2]"
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Successfully updated the advertisement
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

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;
    const priceStr = formData.get("price") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const serviceStartTimeStr = formData.get("serviceStartTime") as string;
    const serviceEndTimeStr = formData.get("serviceEndTime") as string;
    const serviceIdStr = formData.get("serviceId") as string;
    const speciesIdsStr = formData.get("speciesIds") as string;
    const keepImageUrlsStr = formData.get("keepImageUrls") as string;
    const newFiles = formData.getAll("newImages") as File[];

    const price = priceStr ? parseFloat(priceStr) : null;
    if (price !== null && (isNaN(price) || price < 0)) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!title || !startDateStr || !endDateStr || !serviceIdStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const status = formData.get("status") as string;
    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate speciesIds if provided
    let speciesIds: number[] = [];
    if (speciesIdsStr) {
      try {
        speciesIds = JSON.parse(speciesIdsStr);
        if (!Array.isArray(speciesIds)) {
          return NextResponse.json(
            { error: "speciesIds must be an array" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid speciesIds format" },
          { status: 400 }
        );
      }
    }

    if (speciesIds.length > 0) {
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

    const serviceId = parseInt(serviceIdStr);
    const service = await prisma.service.findUnique({
      where: { idService: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    let keepImageUrls: string[] = [];
    try {
      keepImageUrls = JSON.parse(keepImageUrlsStr || "[]");
    } catch {
      keepImageUrls = [];
    }

    const totalImages = keepImageUrls.length + newFiles.length;
    if (totalImages === 0) {
      return NextResponse.json(
        { error: "At least one image must be provided (kept or new)" },
        { status: 400 }
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    const bucket = getStorage().bucket(bucketName);

    // Get old images and delete unkept from storage
    const oldAdImages = await prisma.advertisementImage.findMany({
      where: { Advertisement_idAdvertisement: idNum },
      select: { imageUrl: true },
    });
    const oldUrls = oldAdImages.map((i) => i.imageUrl);
    const toDeleteUrls = oldUrls.filter((url) => !keepImageUrls.includes(url));

    for (const url of toDeleteUrls) {
      const oldPath = extractPathFromSignedUrl(url);
      if (oldPath) {
        try {
          const [exists] = await bucket.file(oldPath).exists();
          if (exists) {
            await bucket.file(oldPath).delete();
            console.log(`Deleted old image: ${oldPath}`);
          }
        } catch (deleteErr) {
          console.error(`Failed to delete old image ${oldPath}:`, deleteErr);
        }
      }
    }

    // Upload new images
    const uploadedNewUrls: string[] = [];
    for (const file of newFiles) {
      const fileName = `advertisements/${decodedToken.uid}/${Date.now()}_${
        file.name
      }`;
      const fileUpload = bucket.file(fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fileUpload.save(buffer, {
        metadata: { contentType: file.type },
      });

      const [url] = await fileUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      uploadedNewUrls.push(url);
    }

    await prisma.$transaction(async (tx) => {
      // Delete all existing images
      await tx.advertisementImage.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });

      let currentOrder = 1;

      // Create kept images
      for (const url of keepImageUrls) {
        await tx.advertisementImage.create({
          data: {
            imageUrl: url,
            order: currentOrder++,
            Advertisement_idAdvertisement: idNum,
          },
        });
      }

      // Create new images
      for (const url of uploadedNewUrls) {
        await tx.advertisementImage.create({
          data: {
            imageUrl: url,
            order: currentOrder++,
            Advertisement_idAdvertisement: idNum,
          },
        });
      }

      // Update species: delete existing, create new
      await tx.advertisementSpiece.deleteMany({
        where: {
          advertisementId: idNum,
        },
      });

      for (const spieceId of speciesIds) {
        await tx.advertisementSpiece.create({
          data: {
            advertisementId: idNum,
            spieceId: spieceId,
          },
        });
      }

      await tx.advertisement.update({
        where: {
          idAdvertisement: idNum,
        },
        data: {
          title,
          description,
          price,
          status: status ? (status as StatusAdvertisement) : undefined,
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
          serviceStartTime: serviceStartTimeStr
            ? new Date(serviceStartTimeStr)
            : null,
          serviceEndTime: serviceEndTimeStr
            ? new Date(serviceEndTimeStr)
            : null,
          Service_idService: serviceId,
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
 *       Also deletes associated images from Firebase Storage, feedback, archive records, and saved advertisements.
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
      await tx.review.deleteMany({
        where: {
          Booking: {
            advertisementId: idNum,
          },
        },
      });
      await tx.archive.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.advertisementSpiece.deleteMany({
        where: {
          advertisementId: idNum,
        },
      });
      await tx.savedAdvertisement.deleteMany({
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
        const path = extractPathFromSignedUrl(img.url);
        if (path) {
          try {
            const [exists] = await bucket.file(path).exists();
            if (exists) {
              await bucket.file(path).delete();
              console.log(`Deleted image from Storage: ${path}`);
            }
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