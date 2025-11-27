import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: "2025-10-29.clover" as const,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Next.js 13+ App Router requires this export
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("🔔 Webhook received");

  try {
    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      console.log("❌ No stripe-signature header");
      return NextResponse.json(
        { error: "Missing Stripe signature" },
        { status: 400 }
      );
    }

    const body = await request.text();
    console.log("📦 Body length:", body.length);

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log("✅ Event verified:", event.type);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return NextResponse.json(
        {
          error: `Webhook Error: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        },
        { status: 400 }
      );
    }

    console.log("📦 Event type:", event.type);
    console.log("📦 Event ID:", event.id);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("💰 Payment status:", session.payment_status);
      console.log("🏷️  Metadata:", session.metadata);
      console.log("👤 User ID:", session.metadata?.userId);

      if (session.payment_status === "paid") {
        const userId = session.metadata?.userId;
        if (!userId) {
          console.log("⚠️  No userId in metadata");
          return NextResponse.json({ received: true });
        }

        console.log("🔍 Looking for user with firebaseUid:", userId);

        const user = await prisma.user.findUnique({
          where: { firebaseUid: userId },
        });

        if (!user) {
          console.error("❌ User not found:", userId);
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        console.log("✅ User found:", user.idUser, user.email);

        // Save payment record
        console.log("💾 Saving payment record");
        await prisma.payment.create({
          data: {
            userId: user.idUser,
            stripeSessionId: session.id,
            amount: session.amount_total || 0,
            status: "completed",
            type: session.metadata?.type || "unknown",
          },
        });
        console.log("✅ Payment record saved");

        if (session.metadata?.type === "become_provider") {
          // Existing logic for become_provider
          const existingProvider = await prisma.service_Provider.findFirst({
            where: { User_idUser: user.idUser },
          });

          if (existingProvider) {
            console.log(
              "📌 Existing provider found:",
              existingProvider.idService_Provider
            );
            if (!existingProvider.isActive) {
              console.log("🔄 Reactivating provider");
              await prisma.service_Provider.update({
                where: {
                  idService_Provider: existingProvider.idService_Provider,
                },
                data: { isActive: true },
              });
              console.log("✅ Provider reactivated");
            } else {
              console.log("⚠️  Provider already active");
              return NextResponse.json({ received: true });
            }
          } else {
            console.log("➕ Creating new service provider");
            await prisma.service_Provider.create({
              data: { User_idUser: user.idUser },
            });
            console.log("✅ Service provider created");
          }

          // Activate advertisements
          const activeProviders = await prisma.service_Provider.findMany({
            where: { User_idUser: user.idUser, isActive: true },
            select: { idService_Provider: true },
          });

          console.log(
            "📢 Activating ads for providers:",
            activeProviders.length
          );

          await prisma.advertisement.updateMany({
            where: {
              Service_Provider_idService_Provider: {
                in: activeProviders.map((p) => p.idService_Provider),
              },
            },
            data: { status: "ACTIVE" },
          });

          console.log("🎉 User successfully became service provider!");
        } else if (session.metadata?.type === "booking_payment") {
          const bookingId = parseInt(session.metadata.bookingId || "0");
          if (!bookingId) {
            console.log("⚠️  No bookingId in metadata");
            return NextResponse.json({ received: true });
          }

          const booking = await prisma.booking.findUnique({
            where: { idBooking: bookingId },
          });

          if (!booking) {
            console.error("❌ Booking not found:", bookingId);
            return NextResponse.json({ received: true });
          }

          await prisma.booking.update({
            where: { idBooking: bookingId },
            data: { status: "PAID" },
          });

          console.log("✅ Booking status updated to PAID:", bookingId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}