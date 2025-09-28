import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Unchanged GET endpoint
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
            isActive: true, // Assumed field for active status
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

    // Check for active service provider status
    const isActiveServiceProvider = user.ServiceProviders.some(
      (sp) =>
        sp.idService_Provider ===
        advertisement.Service_Provider_idService_Provider && sp.isActive
    );

    if (!isActiveServiceProvider) {
      return NextResponse.json(
        { error: "You must be an active service provider to update this advertisement" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // If checkPermissions flag is set, return success without updating
    if (body.checkPermissions) {
      return NextResponse.json({ success: true });
    }

    // Validate status
    if (body.status && !["ACTIVE", "INACTIVE"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Use transaction to update advertisement and handle images
    await prisma.$transaction(async (tx) => {
      // Delete existing images
      await tx.advertisementImage.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });

      // Create new images
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

      // Update advertisement
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
          serviceStartTime: body.serviceStartTime ? new Date(body.serviceStartTime) : null,
          serviceEndTime: body.serviceEndTime ? new Date(body.serviceEndTime) : null,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Unchanged DELETE endpoint
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