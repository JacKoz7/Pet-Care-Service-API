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

    // Calculate time thresholds
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    let bookings = await prisma.booking.findMany({
      where: {
        Service_Provider_idService_Provider: {
          in: serviceProviderIds,
        },
        OR: [
          { status: "PENDING" },
          { status: "CANCELLED", updatedAt: { gte: oneMonthAgo } },
          { status: "REJECTED", updatedAt: { gte: oneMonthAgo } },
          { status: "ACCEPTED" }, // No time limit to catch ones needing update
          { status: "AWAITING_PAYMENT" }, // No time limit
          { status: "OVERDUE", updatedAt: { gte: threeMonthsAgo } },
          { status: "PAID", updatedAt: { gte: threeMonthsAgo } },
        ],
      },
      select: {
        idBooking: true,
        status: true,
        startDateTime: true,
        endDateTime: true,
        message: true,
        advertisementId: true, // Added: Include advertisementId in the query
        updatedAt: true,
        Pets: {
          include: {
            Pet: {
              select: {
                idPet: true,
                name: true,
                age: true,
                description: true,
                chronicDiseases: true,
                isHealthy: true,
                customSpeciesName: true,
                Spiece: {
                  select: {
                    name: true,
                  },
                },
                Images: {
                  orderBy: {
                    order: "asc",
                  },
                  take: 1,
                  select: {
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        Client: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        idBooking: "desc",
      },
    });

    // Update statuses based on time
    for (const booking of bookings) {
      const endTime = new Date(booking.endDateTime).getTime();
      const currentTime = now.getTime();

      if (booking.status === "ACCEPTED" && currentTime > endTime) {
        // Change to AWAITING_PAYMENT
        await prisma.booking.update({
          where: { idBooking: booking.idBooking },
          data: { status: "AWAITING_PAYMENT", updatedAt: now },
        });
        booking.status = "AWAITING_PAYMENT"; // Update local object
        booking.updatedAt = now;
      } else if (
        booking.status === "AWAITING_PAYMENT" &&
        currentTime > endTime + 48 * 60 * 60 * 1000
      ) {
        // Change to OVERDUE after 48h
        await prisma.booking.update({
          where: { idBooking: booking.idBooking },
          data: { status: "OVERDUE", updatedAt: now },
        });
        booking.status = "OVERDUE"; // Update local object
        booking.updatedAt = now;
      }
    }

    // Format the response
    const formattedBookings = bookings.map((booking) => ({
      id: booking.idBooking,
      status: booking.status,
      startDateTime: booking.startDateTime,
      endDateTime: booking.endDateTime,
      message: booking.message,
      advertisementId: booking.advertisementId, // Added: Include advertisementId in the response
      pets: booking.Pets.map((bp) => ({
        id: bp.Pet.idPet,
        name: bp.Pet.name,
        age: bp.Pet.age,
        description: bp.Pet.description,
        chronicDiseases: bp.Pet.chronicDiseases,
        isHealthy: bp.Pet.isHealthy,
        species: bp.Pet.customSpeciesName || bp.Pet.Spiece.name,
        keyImage: bp.Pet.Images[0]?.imageUrl || null,
      })),
      client: {
        firstName: booking.Client.User.firstName,
        lastName: booking.Client.User.lastName,
        email: booking.Client.User.email,
        phoneNumber: booking.Client.User.phoneNumber,
      },
    }));

    // Update lastActive
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Error fetching pending bookings:", error);
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
 * /api/bookings/service-provider/notifications:
 *   get:
 *     summary: Get recent booking notifications for service provider
 *     description: |
 *       Retrieves pending bookings (always) and recent completed/cancelled/rejected bookings within time windows for the authenticated service provider.
 *       - PENDING: No time limit (always returned).
 *       - CANCELLED/REJECTED: Only if updated within the last 1 month.
 *       - ACCEPTED: No time limit (to check for status updates).
 *       - AWAITING_PAYMENT: No time limit.
 *       - OVERDUE: Only if updated within the last 3 months.
 *       - PAID: Only if updated within the last 3 months.
 *       Automatically updates booking status to AWAITING_PAYMENT if end date has passed, and to OVERDUE if 48h after end date without payment.
 *       Requires a valid Firebase authentication token.
 *       Only available to active service providers.
 *       Returns details about all pets in the booking, client (name, email, phone), message, booking times, status, and advertisement ID.
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Recent bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 bookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       status:
 *                         type: string
 *                         enum: [PENDING, ACCEPTED, REJECTED, CANCELLED, AWAITING_PAYMENT, OVERDUE, PAID]
 *                         example: "PENDING"
 *                       startDateTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-25T10:00:00Z"
 *                       endDateTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-25T12:00:00Z"
 *                       message:
 *                         type: string
 *                         nullable: true
 *                         example: "Please confirm the exact hours."
 *                       advertisementId:
 *                         type: integer
 *                         nullable: true
 *                         example: 123
 *                       pets:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Max"
 *                             age:
 *                               type: number
 *                               example: 5
 *                             description:
 *                               type: string
 *                               nullable: true
 *                               example: "Friendly dog"
 *                             chronicDiseases:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["Allergies"]
 *                             isHealthy:
 *                               type: boolean
 *                               nullable: true
 *                               example: true
 *                             species:
 *                               type: string
 *                               example: "Dog"
 *                             keyImage:
 *                               type: string
 *                               nullable: true
 *                               example: "https://example.com/pet.jpg"
 *                       client:
 *                         type: object
 *                         properties:
 *                           firstName:
 *                             type: string
 *                             nullable: true
 *                             example: "John"
 *                           lastName:
 *                             type: string
 *                             nullable: true
 *                             example: "Doe"
 *                           email:
 *                             type: string
 *                             nullable: true
 *                             example: "john.doe@example.com"
 *                           phoneNumber:
 *                             type: string
 *                             nullable: true
 *                             example: "123456789"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not an active service provider)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
