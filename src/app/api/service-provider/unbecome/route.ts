// src/app/api/service-provider/unbecome/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
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
      void error;
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if user exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        ServiceProviders: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a service provider (active)
    if (
      !existingUser.ServiceProviders ||
      existingUser.ServiceProviders.length === 0
    ) {
      return NextResponse.json(
        { error: "User is not a service provider" },
        { status: 400 }
      );
    }

    // Get all active service provider IDs for this user
    const serviceProviderIds = existingUser.ServiceProviders.map(
      (sp) => sp.idService_Provider
    );

    // Deactivate the service provider (set isActive = false)
    // This preserves all related data like advertisements
    await prisma.service_Provider.updateMany({
      where: {
        idService_Provider: {
          in: serviceProviderIds,
        },
      },
      data: {
        isActive: false,
      },
    });

    // Set all associated advertisements to INACTIVE
    await prisma.advertisement.updateMany({
      where: {
        Service_Provider_idService_Provider: {
          in: serviceProviderIds,
        },
      },
      data: {
        status: "INACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service provider role deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating service provider role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}