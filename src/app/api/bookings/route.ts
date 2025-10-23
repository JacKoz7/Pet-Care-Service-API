// src/app/api/bookings/route.ts
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
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { petId, serviceProviderId, startDateTime, endDateTime, message } =
      body;

    // Validate required fields
    if (!petId || !serviceProviderId || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { error: "Invalid start or end date/time" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        Clients: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure user has a client record
    let clientId;
    if (user.Clients.length === 0) {
      const newClient = await prisma.client.create({
        data: {
          User_idUser: user.idUser,
        },
      });
      clientId = newClient.idClient;
    } else {
      clientId = user.Clients[0].idClient;
    }

    // Verify pet belongs to the client
    const pet = await prisma.pet.findUnique({
      where: { idPet: petId },
      select: { Client_idClient: true },
    });

    if (!pet || pet.Client_idClient !== clientId) {
      return NextResponse.json(
        { error: "Invalid pet selection" },
        { status: 400 }
      );
    }

    // Verify service provider exists
    const serviceProvider = await prisma.service_Provider.findUnique({
      where: { idService_Provider: serviceProviderId },
      select: { isActive: true },
    });

    if (!serviceProvider || !serviceProvider.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive service provider" },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        startDateTime: start,
        endDateTime: end,
        message: message || null,
        Client_idClient: clientId,
        Service_Provider_idService_Provider: serviceProviderId,
        Pet_idPet: petId,
      },
    });

    // Update user's lastActive
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
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
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     description: |
 *       Creates a new booking request for a service provider.
 *       Requires a valid Firebase authentication token.
 *       The user must be a client (creates client record if none exists).
 *       The pet must belong to the client.
 *       The service provider must exist and be active.
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *               - serviceProviderId
 *               - startDateTime
 *               - endDateTime
 *             properties:
 *               petId:
 *                 type: integer
 *                 example: 1
 *               serviceProviderId:
 *                 type: integer
 *                 example: 42
 *               startDateTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-25T10:00:00Z"
 *               endDateTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-25T12:00:00Z"
 *               message:
 *                 type: string
 *                 nullable: true
 *                 example: "Please confirm the exact hours."
 *     responses:
 *       200:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 booking:
 *                   type: object
 *                   properties:
 *                     idBooking:
 *                       type: integer
 *                       example: 1
 *                     startDateTime:
 *                       type: string
 *                       format: date-time
 *                     endDateTime:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *                     Client_idClient:
 *                       type: integer
 *                     Service_Provider_idService_Provider:
 *                       type: integer
 *                     Pet_idPet:
 *                       type: integer
 *       400:
 *         description: Missing/invalid fields, invalid pet/provider, or date issues
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
