import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { FirebaseError } from "firebase-admin";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { firebaseUid: string } }
) {
  try {
    // Extract and verify bearer token
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
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if the authenticated user is an admin
    const authUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { Admin: true },
    });

    if (!authUser || !authUser.Admin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { firebaseUid } = params;

    if (!firebaseUid) {
      return NextResponse.json(
        { error: "Firebase UID is required" },
        { status: 400 }
      );
    }

    // First, check if user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Start transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Delete user from database first
      const deletedUser = await tx.user.delete({
        where: { firebaseUid: firebaseUid },
        include: {
          City: true,
        },
      });

      // Delete user from Firebase Auth
      try {
        await adminAuth.deleteUser(firebaseUid);
      } catch (firebaseError) {
        // If Firebase deletion fails, throw error to rollback database transaction
        const error = firebaseError as FirebaseError;
        if (error.code === "auth/user-not-found") {
          // User doesn't exist in Firebase but existed in database
          console.warn(
            `User ${firebaseUid} not found in Firebase Auth, but was deleted from database`
          );
        } else {
          throw new Error(`Firebase deletion failed: ${error.message}`);
        }
      }

      return deletedUser;
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully from both database and Firebase Auth",
      deletedUser: {
        id: result.idUser,
        firebaseUid: result.firebaseUid,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
      },
    });
  } catch (error) {
    console.error("User deletion error:", error);

    // Handle specific error cases
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("Firebase deletion failed")) {
      return NextResponse.json(
        { error: "Failed to delete user from Firebase Auth" },
        { status: 500 }
      );
    }

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
 * /api/user/{firebaseUid}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     description: |
 *       Deletes a user from both the database and Firebase Auth.
 *       This operation is irreversible and will permanently remove all user data.
 *       Requires admin authentication via Firebase ID token.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firebaseUid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID of the user to delete
 *         example: "abcd1234efgh5678"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully from both database and Firebase Auth"
 *                 deletedUser:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     firebaseUid:
 *                       type: string
 *                       example: "abcd1234efgh5678"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     firstName:
 *                       type: string
 *                       nullable: true
 *                       example: "Jane"
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                       example: "Doe"
 *       400:
 *         description: Invalid input (missing Firebase UID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Firebase UID is required"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired token"
 *       403:
 *         description: Forbidden (not an admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized: Admin access required"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found in database"
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
