import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "You ain't got no auth header or it's fucked up, nigga" },
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
        { error: "That token expired or straight invalid, nigga" },
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
      return NextResponse.json({ error: "Can't find yo ass in the system" }, { status: 404 });
    }

    if (user.Clients.length === 0) {
      return NextResponse.json(
        { error: "You ain't no client, nigga – get the fuck outta here" },
        { status: 403 }
      );
    }

    const clientId = user.Clients[0].idClient;

    const body = await request.json();
    const { bookingId, rating, comment } = body;

    if (!bookingId || !rating) {
      return NextResponse.json(
        { error: "Need that booking ID and rating, nigga – don't play" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating gotta be 1-5, you trippin nigga" },
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
        { error: "That booking ghost or you ain't got permission, nigga" },
        { status: 404 }
      );
    }

    // Check if booking status is PAID
    if (booking.status !== "PAID") {
      return NextResponse.json(
        { error: "Only PAID bookings get reviews, nigga – handle yo business first" },
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
        { error: "Already reviewed this shit, nigga – one time only" },
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
      message: "Review dropped successfully, nigga",
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
      { error: "Server crashin out, whole block down rn" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
