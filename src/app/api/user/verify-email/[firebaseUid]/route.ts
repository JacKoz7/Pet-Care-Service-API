// src/app/api/user/verify-email/[firebaseUid]/route.ts (new file, replaces old)

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import admin from "firebase-admin";

const prisma = new PrismaClient();

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { firebaseUid: string } }
) {
  try {
    const { firebaseUid } = params;

    if (!firebaseUid) {
      return NextResponse.json(
        { error: "Firebase UID is required in URL" },
        { status: 400 }
      );
    }

    // Get user from Firebase
    const firebaseUser = await admin.auth().getUser(firebaseUid);

    if (!firebaseUser.emailVerified) {
      return NextResponse.json(
        { error: "Email not verified" },
        { status: 400 }
      );
    }

    // Find user in DB
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isVerified) {
      // Idempotent: already verified
      return NextResponse.json({ success: true });
    }

    // Update DB
    await prisma.user.update({
      where: { firebaseUid },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verification error:", error);
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
 * /api/user/verify-email/{firebaseUid}:
 *   patch:
 *     summary: Verify user email in database
 *     description: |
 *       Updates the user's verification status in the database based on Firebase email verification.
 *       This endpoint is called after the user clicks the verification link in their email.
 *       It is idempotent: if already verified, it returns success without changes.
 *       Authentication is handled via Firebase UID in the path; no body required.
 *     tags: [User]
 *     parameters:
 *       - name: firebaseUid
 *         in: path
 *         required: true
 *         description: Firebase UID of the user (from Firebase Auth)
 *         schema:
 *           type: string
 *           example: "abcd1234efgh5678"
 *     responses:
 *       200:
 *         description: Email verification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid input or email not verified in Firebase
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email not verified"
 *       404:
 *         description: User not found in database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
