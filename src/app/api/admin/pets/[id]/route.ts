// src/app/api/admin/pets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      void error;
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

    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid pet ID" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({
      where: {
        idPet: idNum,
      },
      select: {
        idPet: true,
        Images: {
          select: {
            imageUrl: true,
          },
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const imagesUrls = pet.Images.map((img) => img.imageUrl);

    await prisma.$transaction(async (tx) => {
      await tx.petImage.deleteMany({
        where: {
          Pet_idPet: idNum,
        },
      });
      await tx.analysis.deleteMany({
        where: {
          Pet_idPet: idNum,
        },
      });
      await tx.archive.deleteMany({
        where: {
          Pet_idPet: idNum,
        },
      });
      await tx.pet.delete({
        where: {
          idPet: idNum,
        },
      });
    });

    // Delete images from Firebase Storage
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (bucketName) {
      const bucket = getStorage().bucket(bucketName);
      for (const imgUrl of imagesUrls) {
        const path = decodeURIComponent(
          imgUrl.split("/o/")[1]?.split("?")[0] || ""
        );
        if (path) {
          try {
            await bucket.file(path).delete();
            console.log(`Deleted image from Storage: ${path}`);
          } catch (deleteErr) {
            console.error(`Failed to delete image ${path}:`, deleteErr);
          }
        }
      }
    } else {
      console.error("FIREBASE_STORAGE_BUCKET env var not set");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pet:", error);
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
 * /api/admin/pets/{id}:
 *   delete:
 *     summary: Delete a pet (admin only)
 *     description: |
 *       Deletes a pet and all associated data (images from Firebase Storage, analyses, archives).
 *       This operation is irreversible. Requires admin authentication via Firebase ID token.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the pet to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Pet deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid pet ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid pet ID"
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
 *         description: Pet not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Pet not found"
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
