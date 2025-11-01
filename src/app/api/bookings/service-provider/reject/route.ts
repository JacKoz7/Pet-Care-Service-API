// src/app/api/bookings/service-provider/reject/route.ts
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

    const { bookingId } = await request.json();
    if (!bookingId || typeof bookingId !== "number") {
      return NextResponse.json(
        { error: "Booking ID is required and must be a number" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        ServiceProviders: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.ServiceProviders.length === 0) {
      return NextResponse.json(
        { error: "User is not an active service provider" },
        { status: 403 }
      );
    }

    const serviceProviderIds = user.ServiceProviders.map(
      (sp) => sp.idService_Provider
    );

    const booking = await prisma.booking.findUnique({
      where: { idBooking: bookingId },
      include: {
        Service_Provider: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (
      !serviceProviderIds.includes(booking.Service_Provider_idService_Provider)
    ) {
      return NextResponse.json(
        { error: "Unauthorized to reject this booking" },
        { status: 403 }
      );
    }

    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only reject pending bookings" },
        { status: 400 }
      );
    }

    await prisma.booking.update({
      where: { idBooking: bookingId },
      data: { status: "REJECTED" },
    });

    // Update lastActive
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Booking rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting booking:", error);
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
 * /api/bookings/service-provider/reject:
 *   post:
 *     summary: Reject a pending booking as service provider
 *     description: |
 *       Allows the authenticated service provider to reject a pending booking.
 *       Only pending bookings can be rejected.
 *       Requires a valid Firebase authentication token.
 *       Only available to active service providers.
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 example: 1
 *                 description: The ID of the booking to reject
 *     responses:
 *       200:
 *         description: Booking rejected successfully
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
 *                   example: "Booking rejected successfully"
 *       400:
 *         description: Bad request (invalid booking ID or not pending)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not an active service provider or unauthorized for this booking)
 *       404:
 *         description: Booking or user not found
 *       500:
 *         description: Internal server error
 */
