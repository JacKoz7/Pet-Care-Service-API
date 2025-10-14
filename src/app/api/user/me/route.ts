// src/app/api/user/me/route.ts
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        City: true,
        Admin: true,
        ServiceProviders: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found. Please complete registration." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
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
      },
    });
  } catch (error) {
    console.error("Get user attributes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phoneNumber, cityId } = body;

    // Validate input
    if (
      phoneNumber &&
      (phoneNumber.length !== 9 || !/^\d+$/.test(phoneNumber))
    ) {
      return NextResponse.json(
        { error: "Phone number must be exactly 9 digits" },
        { status: 400 }
      );
    }

    if (cityId !== undefined) {
      const cityExists = await prisma.city.findUnique({
        where: { idCity: Number(cityId) },
      });
      if (!cityExists) {
        return NextResponse.json({ error: "Invalid city ID" }, { status: 400 });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { idUser: user.idUser },
      data: {
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
        City_idCity: cityId !== undefined ? Number(cityId) : user.City_idCity,
      },
      include: {
        City: true,
        Admin: true,
        ServiceProviders: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.idUser,
        firebaseUid: updatedUser.firebaseUid,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePictureUrl: updatedUser.profilePictureUrl,
        city: {
          idCity: updatedUser.City.idCity,
          name: updatedUser.City.name,
          imageUrl: updatedUser.City.imageUrl,
        },
        isAdmin: !!updatedUser.Admin,
        isServiceProvider: updatedUser.ServiceProviders.length > 0,
        lastActive: updatedUser.lastActive,
      },
    });
  } catch (error) {
    console.error("Update user attributes error:", error);
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
 * /api/user/me:
 *   get:
 *     summary: Get current user attributes
 *     description: |
 *       Returns the profile information of the currently authenticated user.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       Also updates the user's lastActive timestamp.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User attributes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     firebaseUid:
 *                       type: string
 *                       example: "abcd1234efgh5678"
 *                     firstName:
 *                       type: string
 *                       nullable: true
 *                       example: "Jane"
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                       example: "123456789"
 *                     profilePictureUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://storage.googleapis.com/bucket/profile_pictures/1_123456789_image.jpg?..."
 *                     city:
 *                       type: object
 *                       properties:
 *                         idCity:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Warszawa"
 *                         imageUrl:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/city.jpg"
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *                     isServiceProvider:
 *                       type: boolean
 *                       example: false
 *                     lastActive:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-16T12:00:00Z"
 *       400:
 *         description: User profile incomplete (e.g., missing city)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update current user attributes
 *     description: |
 *       Updates the profile information of the currently authenticated user.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       Only firstName, lastName, phoneNumber, and cityId can be updated.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 nullable: true
 *                 example: "Jane"
 *               lastName:
 *                 type: string
 *                 nullable: true
 *                 example: "Doe"
 *               phoneNumber:
 *                 type: string
 *                 nullable: true
 *                 example: "123456789"
 *               cityId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *     responses:
 *       200:
 *         description: User attributes updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     firebaseUid:
 *                       type: string
 *                       example: "abcd1234efgh5678"
 *                     firstName:
 *                       type: string
 *                       nullable: true
 *                       example: "Jane"
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                       example: "123456789"
 *                     profilePictureUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://storage.googleapis.com/bucket/profile_pictures/1_123456789_image.jpg?..."
 *                     city:
 *                       type: object
 *                       properties:
 *                         idCity:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Warszawa"
 *                         imageUrl:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/city.jpg"
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *                     isServiceProvider:
 *                       type: boolean
 *                       example: false
 *                     lastActive:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-16T12:00:00Z"
 *       400:
 *         description: Invalid input (e.g., invalid phone number or city ID)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */
