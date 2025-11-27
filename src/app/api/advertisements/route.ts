// app/api/advertisements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

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
    const files = formData.getAll("images") as File[];

    // Basic validation
    if (
      !title ||
      !startDateStr ||
      !endDateStr ||
      !serviceIdStr ||
      !Array.isArray(files) ||
      files.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields or no images provided" },
        { status: 400 }
      );
    }

    // Validate price
    const price = priceStr ? parseFloat(priceStr) : null;
    if (price !== null && (isNaN(price) || price < 0)) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        ServiceProviders: {
          where: { isActive: true },
        },
        City: true,
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
    const serviceId = parseInt(serviceIdStr);
    const service = await prisma.service.findUnique({
      where: { idService: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Validate speciesIds exist if provided
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

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    const bucket = getStorage().bucket(bucketName);
    const uploadedUrls: string[] = [];

    for (const file of files) {
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

      uploadedUrls.push(url);
    }

    // Create advertisement
    const advertisement = await prisma.advertisement.create({
      data: {
        title,
        description,
        price,
        status: "ACTIVE",
        startDate: new Date(startDateStr),
        endDate: new Date(endDateStr),
        serviceStartTime: serviceStartTimeStr
          ? new Date(serviceStartTimeStr)
          : null,
        serviceEndTime: serviceEndTimeStr ? new Date(serviceEndTimeStr) : null,
        Service_idService: serviceId,
        Service_Provider_idService_Provider: serviceProviderId,
        Images: {
          create: uploadedUrls.map((url, i) => ({
            imageUrl: url,
            order: i + 1,
          })),
        },
        AdvertisementSpieces: {
          create: speciesIds.map((id: number) => ({
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
        serviceProviderId: serviceProviderId,
        service: service.name,
        provider: {
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        },
        city: {
          idCity: user.City.idCity,
          name: user.City.name,
          imageUrl: user.City.imageUrl,
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