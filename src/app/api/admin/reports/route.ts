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
