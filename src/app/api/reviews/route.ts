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

    const body = await request.json();
    const { bookingId, rating, comment } = body;

    if (!bookingId || !rating) {
      return NextResponse.json(
        { error: "Booking ID and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if booking exists and belongs to client
    const booking = await prisma.booking.findFirst({
      where: {
        idBooking: bookingId,
        Client_idClient: clientId,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or you don't have permission" },
        { status: 404 }
      );
    }

    // Check if booking status is PAID
    if (booking.status !== "PAID") {
      return NextResponse.json(
        { error: "You can only review bookings with PAID status" },
        { status: 400 }
      );
    }

    // Check if review already exists for this booking
    const existingReview = await prisma.review.findUnique({
      where: {
        Booking_idBooking: bookingId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "Review already exists for this booking" },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment || null,
        Client_idClient: clientId,
        Service_Provider_idService_Provider:
          booking.Service_Provider_idService_Provider,
        Booking_idBooking: bookingId,
      },
    });

    // Update user's last active
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Review created successfully",
      review: {
        id: review.idReview,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}