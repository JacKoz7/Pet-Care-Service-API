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

    const booking = await prisma.booking.findUnique({
      where: { idBooking: bookingId },
      include: {
        Client: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.Client_idClient !== clientId) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this booking" },
        { status: 403 }
      );
    }

    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only cancel pending bookings" },
        { status: 400 }
      );
    }

    await prisma.booking.update({
      where: { idBooking: bookingId },
      data: { status: "CANCELLED" },
    });

    // Update lastActive
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}