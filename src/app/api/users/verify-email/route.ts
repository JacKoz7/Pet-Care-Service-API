import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { FirebaseError } from "firebase-admin";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid } = await request.json();

    // Validation
    if (!firebaseUid) {
      return NextResponse.json(
        { error: "Firebase UID is required" },
        { status: 400 }
      );
    }

    // Use the shared adminAuth instance
    const firebaseUser = await adminAuth.getUser(firebaseUid);

    // Sprawdź czy email jest zweryfikowany w Firebase
    if (firebaseUser.emailVerified) {
      // Sprawdź czy w bazie już nie jest verified (żeby nie robić niepotrzebnego update)
      const dbUser = await prisma.user.findUnique({
        where: { firebaseUid },
        select: { isEmailVerified: true },
      });

      // Zaktualizuj tylko jeśli nie jest jeszcze verified
      if (dbUser && !dbUser.isEmailVerified) {
        await prisma.user.update({
          where: { firebaseUid },
          data: { isEmailVerified: true },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Email not verified" }, { status: 400 });
  } catch (error) {
    console.error("Email verification error:", error);

    // Handle specific Firebase errors
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === "auth/user-not-found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
