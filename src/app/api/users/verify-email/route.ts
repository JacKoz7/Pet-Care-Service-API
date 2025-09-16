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
    
    if (firebaseUser.emailVerified) {
      await prisma.user.update({
        where: { firebaseUid },
        data: { isEmailVerified: true },
      });
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Email not verified" }, 
      { status: 400 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    
    // Handle specific Firebase errors
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Verification failed" }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * @swagger
 * /api/users/verify-email:
 *   post:
 *     summary: Verify user email
 *     description: |
 *       This endpoint checks with Firebase Authentication if the user's email is verified.
 *       If it is verified, the `isEmailVerified` flag in the database will be updated to `true`.
 *       A user cannot log in until their email is verified via Firebase.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firebaseUid
 *             properties:
 *               firebaseUid:
 *                 type: string
 *                 description: Firebase UID of the user (from Firebase Auth)
 *                 example: "abcd1234efgh5678"
 *     responses:
 *       200:
 *         description: Email successfully verified and database updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Email is not yet verified in Firebase or missing Firebase UID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email not verified"
 *       404:
 *         description: User not found in Firebase
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Verification failed due to internal error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Verification failed"
 */