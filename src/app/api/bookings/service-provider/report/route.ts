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

    const body = await request.json();
    const { bookingId, message } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const serviceProviderIds = user.ServiceProviders.map(
      (sp) => sp.idService_Provider
    );

    // Find the booking
    const booking = await prisma.booking.findFirst({
      where: {
        idBooking: bookingId,
        Service_Provider_idService_Provider: {
          in: serviceProviderIds,
        },
      },
      include: {
        Client: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or you don't have permission" },
        { status: 404 }
      );
    }

    // Check if booking is OVERDUE
    if (booking.status !== "OVERDUE") {
      return NextResponse.json(
        { error: "Only OVERDUE bookings can be reported" },
        { status: 400 }
      );
    }

    // Check if report already exists for this booking
    const existingReport = await prisma.report.findFirst({
      where: {
        Booking_idBooking: bookingId,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "This booking has already been reported" },
        { status: 400 }
      );
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        message: message || null,
        Booking_idBooking: booking.idBooking,
        Client_idClient: booking.Client_idClient,
        Service_Provider_idService_Provider:
          booking.Service_Provider_idService_Provider,
      },
    });

    // Update user's last active
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully",
      report: {
        id: report.idReport,
        bookingId: report.Booking_idBooking,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating report:", error);
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
 * /api/bookings/service-provider/report:
 *   post:
 *     summary: Report a client for non-payment (service provider only)
 *     description: |
 *       Allows service providers to report clients who haven't paid for OVERDUE bookings.
 *       Creates a report that will be visible to admins.
 *       - Can only report bookings with OVERDUE status.
 *       - Each booking can only be reported once.
 *       - Requires valid Firebase authentication token.
 *       - Only available to active service providers.
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
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the OVERDUE booking to report
 *                 example: 123
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional message describing the non-payment issue
 *                 example: "Client hasn't responded to payment reminders for over a week"
 *     responses:
 *       200:
 *         description: Report submitted successfully
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
 *                   example: "Report submitted successfully"
 *                 report:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     bookingId:
 *                       type: integer
 *                       example: 123
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-18T11:56:00Z"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only OVERDUE bookings can be reported"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not an active service provider)
 *       404:
 *         description: Booking not found or no permission
 *       500:
 *         description: Internal server error
 */