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
        Clients: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.Clients.length === 0) {
      return NextResponse.json(
        { error: "User is not a client" },
        { status: 403 }
      );
    }

    const clientId = user.Clients[0].idClient;

    // Calculate time thresholds
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        Client_idClient: clientId,
        OR: [
          { status: "PENDING" },
          { status: "CANCELLED", updatedAt: { gte: oneMonthAgo } },
          { status: "REJECTED", updatedAt: { gte: oneMonthAgo } },
          { status: "ACCEPTED" }, 
          { status: "AWAITING_PAYMENT" }, 
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
        advertisementId: true, 
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
        Service_Provider: {
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
        booking.status = "AWAITING_PAYMENT"; 
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
        booking.status = "OVERDUE"; 
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
      advertisementId: booking.advertisementId, 
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
      provider: {
        firstName: booking.Service_Provider.User.firstName,
        lastName: booking.Service_Provider.User.lastName,
        email: booking.Service_Provider.User.email,
        phoneNumber: booking.Service_Provider.User.phoneNumber,
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