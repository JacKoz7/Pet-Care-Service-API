// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Extract and verify bearer token
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

    // Check if the authenticated user is an admin
    const authUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { Admin: true },
    });

    if (!authUser || !authUser.Admin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      },
      include: {
        Admin: true,
        ServiceProviders: true,
        City: true,
      },
      take: limit,
      skip: offset,
      orderBy: { idUser: "asc" },
    });

    const total = await prisma.user.count({
      where: {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.idUser,
      firebaseUid: user.firebaseUid,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
      city: {
        idCity: user.City.idCity,
        name: user.City.name,
        imageUrl: user.City.imageUrl,
      },
      isAdmin: !!user.Admin,
      isServiceProvider: user.ServiceProviders.length > 0,
      lastActive: user.lastActive,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get users error:", error);
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
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     description: |
 *       Retrieves a paginated list of all users in the system.
 *       Supports search by email, first name, or last name.
 *       Requires admin authentication via Firebase ID token.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for email, first name, or last name
 *         example: "jane"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 42
 *                       firebaseUid:
 *                         type: string
 *                         example: "abcd1234efgh5678"
 *                       firstName:
 *                         type: string
 *                         nullable: true
 *                         example: "Jane"
 *                       lastName:
 *                         type: string
 *                         nullable: true
 *                         example: "Doe"
 *                       email:
 *                         type: string
 *                         example: "jane.doe@example.com"
 *                       phoneNumber:
 *                         type: string
 *                         nullable: true
 *                         example: "123456789"
 *                       profilePictureUrl:
 *                         type: string
 *                         nullable: true
 *                       city:
 *                         type: object
 *                         properties:
 *                           idCity:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Warszawa"
 *                           imageUrl:
 *                             type: string
 *                             nullable: true
 *                       isAdmin:
 *                         type: boolean
 *                         example: false
 *                       isServiceProvider:
 *                         type: boolean
 *                         example: false
 *                       lastActive:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 offset:
 *                   type: integer
 *                   example: 0
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (not an admin)
 *       500:
 *         description: Internal server error
 */
