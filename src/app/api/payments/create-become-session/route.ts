// src/app/api/payments/create-become-session/route.ts
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
    const { email } = body;

    const origin = request.headers.get("origin");

    const successUrl = origin
      ? `${origin}/payment-success`
      : "petstaytion://become-provider/success";

    const cancelUrl = origin
      ? `${origin}/payment-cancelled`
      : "petstaytion://become-provider/cancelled";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: { name: "Become a Service Provider!" },
            unit_amount: parseInt(process.env.BECOME_PROVIDER_PRICE || "1000"),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || decodedToken.email,
      metadata: {
        userId: decodedToken.uid,
        type: "become_provider",
      },
    });

    // Return url instead of sessionId
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}