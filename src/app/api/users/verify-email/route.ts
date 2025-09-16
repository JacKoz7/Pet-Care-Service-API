// app/api/users/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

const prisma = new PrismaClient();

// Inicjalizuj Firebase Admin (tylko raz)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid } = await request.json();

    // Użyj getAuth() zamiast auth
    const firebaseUser = await getAuth().getUser(firebaseUid);

    if (firebaseUser.emailVerified) {
      await prisma.user.update({
        where: { firebaseUid },
        data: { isEmailVerified: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Email not verified" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
