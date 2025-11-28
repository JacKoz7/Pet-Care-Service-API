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
    const { petIds, advertisementId, startDateTime, endDateTime, message } =
      body;

    // Validate required fields
    if (
      !Array.isArray(petIds) ||
      petIds.length === 0 ||
      !advertisementId ||
      !startDateTime ||
      !endDateTime
    ) {
      return NextResponse.json(
        { error: "Missing required fields or invalid petIds" },
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
        ServiceProviders: true,
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

    // Verify advertisement exists and get provider and price
    const advertisement = await prisma.advertisement.findUnique({
      where: { idAdvertisement: advertisementId },
      include: { Service_Provider: true },
    });

    if (!advertisement || advertisement.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Invalid or inactive advertisement" },
        { status: 400 }
      );
    }

    if (!advertisement.Service_Provider.isActive) {
      return NextResponse.json(
        { error: "Service provider is inactive" },
        { status: 400 }
      );
    }

    // Prevent booking own advertisement
    const isOwner = user.ServiceProviders.some(
      (sp) => sp.idService_Provider === advertisement.Service_Provider_idService_Provider
    );
    if (isOwner) {
      return NextResponse.json(
        { error: "Cannot book your own advertisement" },
        { status: 403 }
      );
    }

    // Validate all pets belong to the client
    const pets = await prisma.pet.findMany({
      where: {
        idPet: { in: petIds },
        Client_idClient: clientId,
      },
      select: { idPet: true },
    });

    if (pets.length !== petIds.length) {
      return NextResponse.json(
        { error: "One or more selected pets do not belong to you" },
        { status: 400 }
      );
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        startDateTime: start,
        endDateTime: end,
        message: message || null,
        Client_idClient: clientId,
        Service_Provider_idService_Provider:
          advertisement.Service_Provider_idService_Provider,
        advertisementId: advertisementId,
        price: advertisement.price,
      },
    });

    // Create BookingPet entries for each pet
    await prisma.bookingPet.createMany({
      data: petIds.map((petId: number) => ({
        Booking_idBooking: booking.idBooking,
        Pet_idPet: petId,
      })),
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