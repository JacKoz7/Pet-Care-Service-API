// app/api/user/check-role/route.ts (updated: add isVerified check)

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
            isActive: true, // NEW: Select isActive to check for role
          },
          // No 'where'—fetch ALL for full ownership support
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

    // NEW: Check if email is verified in DB
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

/**
 * @swagger
 * /api/user/check-role:
 *   get:
 *     summary: Check user roles and IDs
 *     description: |
 *       Returns all roles and associated service provider and client IDs of the currently authenticated user.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       All users have the 'client' role. Additional roles can be 'admin' and/or 'service_provider' (only if at least one ServiceProvider is active).
 *       serviceProviderIds includes ALL linked providers (active or inactive).
 *       clientIds includes ALL linked clients.
 *       Checks if email is verified in DB; returns 403 if not.
 *     tags: [Debug]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User roles and IDs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [client, admin, service_provider]
 *                   example: ["client", "service_provider"]
 *                 serviceProviderIds:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [1, 2]
 *                   description: Array of all service provider IDs linked to the user
 *                 clientIds:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [1]
 *                   description: Array of all client IDs linked to the user
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Email not verified in database
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */
