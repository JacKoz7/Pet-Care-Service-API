import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: "2025-10-29.clover" as const,
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { Clients: true },
    });

    if (!user || user.Clients.length === 0) {
      return NextResponse.json({ error: "User not a client" }, { status: 403 });
    }

    const clientId = user.Clients[0].idClient;

    const booking = await prisma.booking.findUnique({
      where: { idBooking: bookingId },
      include: { Client: true },
    });

    if (!booking || booking.Client_idClient !== clientId) {
      return NextResponse.json(
        { error: "Booking not found or unauthorized" },
        { status: 404 }
      );
    }

    if (!["AWAITING_PAYMENT", "OVERDUE"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Booking not eligible for payment" },
        { status: 400 }
      );
    }

    if (!booking.price) {
      return NextResponse.json(
        { error: "No price set for booking" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin");

    const successUrl = origin
      ? `${origin}/booking-payment-success`
      : "petstaytion://booking-payment/success";

    const cancelUrl = origin
      ? `${origin}/booking-payment-cancelled`
      : "petstaytion://booking-payment/cancelled";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: { name: `Payment for Booking #${booking.idBooking}` },
            unit_amount: Math.round(booking.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: decodedToken.email,
      metadata: {
        userId: decodedToken.uid,
        bookingId: booking.idBooking.toString(),
        type: "booking_payment",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating booking checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}