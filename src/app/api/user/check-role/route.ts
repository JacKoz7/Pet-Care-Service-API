// src/app/api/user/check-role/route.ts
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
        ServiceProviders: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Collect all roles the user has
    const roles: string[] = ['client']; // Everyone is a client

    // Check if user is admin
    if (user.Admin) {
      roles.push('admin');
    }

    // Check if user is service provider
    if (user.ServiceProviders && user.ServiceProviders.length > 0) {
      roles.push('service_provider');
    }

    return NextResponse.json({ roles });
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
 *     summary: Check user roles (for testing)
 *     description: |
 *       Returns all roles of the currently authenticated user.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       All users have the 'client' role. Additional roles can be 'admin' and/or 'service_provider'.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User roles retrieved successfully
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
 *                   description: Array of roles the authenticated user has
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */