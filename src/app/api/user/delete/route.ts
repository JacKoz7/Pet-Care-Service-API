// app/api/user/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { FirebaseError } from "firebase-admin";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
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

    const firebaseUid = decodedToken.uid;

    // Find the user with all related data
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        Clients: {
          include: {
            Pets: true,
          },
        },
        ServiceProviders: {
          include: {
            Advertisements: true,
          },
        },
        Admin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Collect IDs for batch deletes
    const clientIds = user.Clients.map((c) => c.idClient);
    const spIds = user.ServiceProviders.map((sp) => sp.idService_Provider);
    const petIds = user.Clients.flatMap((c) => c.Pets.map((p) => p.idPet));
    const adIds = user.ServiceProviders.flatMap((sp) =>
      sp.Advertisements.map((a) => a.idAdvertisement)
    );

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Delete feedbacks and bookings related to user
      await tx.feedback.deleteMany({
        where: {
          OR: [
            { Client_idClient: { in: clientIds } },
            { Service_Provider_idService_Provider: { in: spIds } },
          ],
        },
      });

      await tx.booking.deleteMany({
        where: {
          OR: [
            { Client_idClient: { in: clientIds } },
            { Service_Provider_idService_Provider: { in: spIds } },
          ],
        },
      });

      // Delete archives related to user's pets and ads
      await tx.archive.deleteMany({
        where: {
          OR: [
            { Pet_idPet: { in: petIds } },
            { Advertisement_idAdvertisement: { in: adIds } },
          ],
        },
      });

      // Delete analyses for pets
      await tx.analysis.deleteMany({
        where: { Pet_idPet: { in: petIds } },
      });

      // Delete pet images
      await tx.petImage.deleteMany({
        where: { Pet_idPet: { in: petIds } },
      });

      // Delete ad images
      await tx.advertisementImage.deleteMany({
        where: { Advertisement_idAdvertisement: { in: adIds } },
      });

      // Delete advertisements
      await tx.advertisement.deleteMany({
        where: { idAdvertisement: { in: adIds } },
      });

      // Delete pets
      await tx.pet.deleteMany({
        where: { Client_idClient: { in: clientIds } },
      });

      // Delete advertisement archives
      await tx.advertisementArchive.deleteMany({
        where: { serviceProviderId: { in: spIds } },
      });

      // Delete availabilities
      await tx.availability.deleteMany({
        where: { Service_Provider_idService_Provider: { in: spIds } },
      });

      // Delete clients and service providers
      await tx.client.deleteMany({
        where: { idClient: { in: clientIds } },
      });

      await tx.service_Provider.deleteMany({
        where: { idService_Provider: { in: spIds } },
      });

      // Delete admin if exists
      if (user.Admin) {
        await tx.admin.delete({
          where: { User_idUser: user.idUser },
        });
      }

      // Delete user
      await tx.user.delete({
        where: { idUser: user.idUser },
      });
    });

    // Delete user from Firebase Auth
    try {
      await adminAuth.deleteUser(firebaseUid);
    } catch (firebaseError) {
      const err = firebaseError as FirebaseError;
      if (err.code === "auth/user-not-found") {
        console.warn(
          `User ${firebaseUid} not found in Firebase Auth, but was deleted from database`
        );
      } else {
        throw new Error(`Firebase deletion failed: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Account deleted successfully from both database and Firebase Auth",
    });
  } catch (err) {
    console.error("Account deletion error:", err);

    // Handle specific error cases
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
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
 * /api/user/delete:
 *   delete:
 *     summary: Delete own account (self-deletion)
 *     description: |
 *       Deletes the authenticated user's account from both the database and Firebase Auth.
 *       This operation is irreversible and will permanently remove all user data, including pets, advertisements, bookings, and related entities.
 *       Requires authentication via Firebase ID token. Any user (client, service provider, or admin) can delete their own account.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: "Account deleted successfully from both database and Firebase Auth"
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
 *       404:
 *         description: User not found
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
