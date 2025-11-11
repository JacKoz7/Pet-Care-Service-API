import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: { name: "Zostań Usłogodawcą!" },
            unit_amount: parseInt(process.env.BECOME_PROVIDER_PRICE || "1000"),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/?payment=success`,
      cancel_url: `${request.headers.get(
        "origin"
      )}/?payment=cancelled`,
      customer_email: email || decodedToken.email,
      metadata: {
        userId: decodedToken.uid,
        type: "become_provider",
      },
    });

    // Zwracaj url zamiast sessionId
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

/**
 * @swagger
 * /api/payments/create-become-session:
 *   post:
 *     summonsary: Tworzy sesję płatności Stripe dla zostania dostawcą usług
 *     description: |
 *       Tworzy jednorazową sesję płatności. Wymaga ważnego tokenu Firebase.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesja utworzona
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       401:
 *         description: Nieautoryzowany
 *       500:
 *         description: Błąd serwera
 */
