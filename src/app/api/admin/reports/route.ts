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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { Admin: true },
    });

    if (!user || !user.Admin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const reports = await prisma.report.findMany({
      include: {
        Booking: {
          include: {
            Pets: {
              include: {
                Pet: {
                  select: {
                    name: true,
                    Spiece: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            Advertisement: {
              select: {
                title: true,
              },
            },
          },
        },
        Client: {
          include: {
            User: {
              select: {
                firebaseUid: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        Service_Provider: {
          include: {
            User: {
              select: {
                firebaseUid: true,
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
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.report.count();

    const formattedReports = reports.map((report) => ({
      id: report.idReport,
      message: report.message,
      createdAt: report.createdAt,
      booking: {
        id: report.Booking.idBooking,
        startDateTime: report.Booking.startDateTime,
        endDateTime: report.Booking.endDateTime,
        status: report.Booking.status,
        price: report.Booking.price,
        advertisement: report.Booking.Advertisement?.title || null,
        pets: report.Booking.Pets.map((bp) => ({
          name: bp.Pet.name,
          species: bp.Pet.Spiece.name,
        })),
      },
      client: {
        firebaseUid: report.Client.User.firebaseUid,
        firstName: report.Client.User.firstName,
        lastName: report.Client.User.lastName,
        email: report.Client.User.email,
        phoneNumber: report.Client.User.phoneNumber,
      },
      serviceProvider: {
        firebaseUid: report.Service_Provider.User.firebaseUid,
        firstName: report.Service_Provider.User.firstName,
        lastName: report.Service_Provider.User.lastName,
        email: report.Service_Provider.User.email,
        phoneNumber: report.Service_Provider.User.phoneNumber,
      },
    }));

    return NextResponse.json({
      success: true,
      reports: formattedReports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
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
 * /api/admin/reports:
 *   get:
 *     summary: Get all non-payment reports (admin only)
 *     description: |
 *       Retrieves all payment reports submitted by service providers about clients who haven't paid for OVERDUE bookings.
 *       Returns detailed information about:
 *       - Booking details (dates, status, price, advertisement, pets)
 *       - Client information (name, email, phone, Firebase UID)
 *       - Service provider information (name, email, phone, Firebase UID)
 *       - Report message and creation date
 *       Requires admin authentication via Firebase ID token.
 *       Results are sorted by creation date (newest first).
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of reports to return per page
 *         example: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination (skip first N reports)
 *         example: 0
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       message:
 *                         type: string
 *                         nullable: true
 *                         example: "Client hasn't responded to payment reminders for over a week"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-18T11:56:00Z"
 *                       booking:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           startDateTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-10T10:00:00Z"
 *                           endDateTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-10T12:00:00Z"
 *                           status:
 *                             type: string
 *                             example: "OVERDUE"
 *                           price:
 *                             type: number
 *                             nullable: true
 *                             example: 150.00
 *                           advertisement:
 *                             type: string
 *                             nullable: true
 *                             example: "Dog walking service"
 *                           pets:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: "Max"
 *                                 species:
 *                                   type: string
 *                                   example: "Dog"
 *                       client:
 *                         type: object
 *                         properties:
 *                           firebaseUid:
 *                             type: string
 *                             example: "abcd1234efgh5678"
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
 *                       serviceProvider:
 *                         type: object
 *                         properties:
 *                           firebaseUid:
 *                             type: string
 *                             example: "wxyz9876abcd4321"
 *                           firstName:
 *                             type: string
 *                             nullable: true
 *                             example: "Jane"
 *                           lastName:
 *                             type: string
 *                             nullable: true
 *                             example: "Smith"
 *                           email:
 *                             type: string
 *                             nullable: true
 *                             example: "jane.smith@example.com"
 *                           phoneNumber:
 *                             type: string
 *                             nullable: true
 *                             example: "987654321"
 *                 total:
 *                   type: integer
 *                   description: Total number of reports in the database
 *                   example: 15
 *                 limit:
 *                   type: integer
 *                   example: 50
 *                 offset:
 *                   type: integer
 *                   example: 0
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired token"
 *       403:
 *         description: Forbidden (not an admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized: Admin access required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
