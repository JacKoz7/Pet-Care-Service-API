// src/app/api/service-provider/become/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

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
      void error;
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if user already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        Admin: true,
        ServiceProviders: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is an admin
    if (existingUser.Admin) {
      return NextResponse.json(
        { error: "Admins cannot become service providers" },
        { status: 400 }
      );
    }

    // Check if user already has a service provider record (active or inactive)
    const existingServiceProvider = existingUser.ServiceProviders.find(
      (sp) => sp.User_idUser === existingUser.idUser
    );

    let serviceProvider;
    if (existingServiceProvider) {
      // Reactivate if inactive
      if (!existingServiceProvider.isActive) {
        serviceProvider = await prisma.service_Provider.update({
          where: {
            idService_Provider: existingServiceProvider.idService_Provider,
          },
          data: { isActive: true },
        });
      } else {
        return NextResponse.json(
          { error: "User is already a service provider" },
          { status: 400 }
        );
      }
    } else {
      // Create new service provider record
      serviceProvider = await prisma.service_Provider.create({
        data: {
          User_idUser: existingUser.idUser,
        },
      });
    }

    // Get all active service provider IDs for this user
    const activeServiceProviders = await prisma.service_Provider.findMany({
      where: {
        User_idUser: existingUser.idUser,
        isActive: true,
      },
      select: {
        idService_Provider: true,
      },
    });

    const activeIds = activeServiceProviders.map((sp) => sp.idService_Provider);

    // Set all associated advertisements to ACTIVE
    await prisma.advertisement.updateMany({
      where: {
        Service_Provider_idService_Provider: {
          in: activeIds,
        },
      },
      data: {
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "User is now a service provider",
      serviceProviderId: serviceProvider.idService_Provider,
    });
  } catch (error) {
    console.error("Error creating service provider:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}