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
                profilePictureUrl: true, 
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
            advertisement.Service_Provider.User.profilePictureUrl, 
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