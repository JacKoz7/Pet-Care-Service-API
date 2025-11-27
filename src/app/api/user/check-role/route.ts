import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
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

    // First find the user in our database by firebaseUid
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        Admin: true,
        ServiceProviders: {
          select: {
            idService_Provider: true,
            isActive: true, // Select isActive to check for role
          },
        },
        Clients: {
          select: {
            idClient: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if email is verified in DB
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error:
            "Email not verified. Please verify your email to access your account.",
        },
        { status: 403 }
      );
    }

    // Collect ALL service provider IDs (for ownership, active or not)
    const serviceProviderIds = user.ServiceProviders.map(
      (sp) => sp.idService_Provider
    );

    // Collect all client IDs
    const clientIds = user.Clients.map((c) => c.idClient);

    // Collect all roles the user has
    const roles: string[] = ["client"]; // Everyone is a client

    // Check if user is admin
    if (user.Admin) {
      roles.push("admin");
    }

    // Check if user has AT LEAST ONE ACTIVE service provider
    const activeServiceProviders = user.ServiceProviders.filter(
      (sp) => sp.isActive
    );
    if (activeServiceProviders.length > 0) {
      roles.push("service_provider");
    }

    // Update lastActive for consistency (optional, but matches my-ads API)
    await prisma.user.update({
      where: { firebaseUid: decodedToken.uid },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      roles,
      serviceProviderIds,
      clientIds,
    });
  } catch (error) {
    console.error("Error checking user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}