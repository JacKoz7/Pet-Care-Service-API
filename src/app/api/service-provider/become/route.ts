// src/app/api/user/become-service-provider/route.ts
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

    // Check if user is already a service provider
    if (
      existingUser.ServiceProviders &&
      existingUser.ServiceProviders.length > 0
    ) {
      return NextResponse.json(
        { error: "User is already a service provider" },
        { status: 400 }
      );
    }

    // Check if user is an admin
    if (existingUser.Admin) {
      return NextResponse.json(
        { error: "Admins cannot become service providers" },
        { status: 400 }
      );
    }

    // Create service provider record using the database ID
    const serviceProvider = await prisma.service_Provider.create({
      data: {
        User_idUser: existingUser.idUser,
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

/**
 * @swagger
 * /api/service-provider/become:
 *   post:
 *     summary: Become a service provider
 *     description: |
 *       Converts the currently authenticated user to a service provider role.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       User must not already be a service provider.
 *     tags: [Service Provider]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User successfully became a service provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User is now a service provider"
 *                 serviceProviderId:
 *                   type: integer
 *                   example: 42
 *                   description: ID of the newly created service provider record
 *       400:
 *         description: Bad request (user is already a service provider or admin)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */
