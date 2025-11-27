// src/app/api/admin/advertisements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
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
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: idNum,
      },
      select: {
        idAdvertisement: true,
        title: true,
        description: true,
        price: true,
        status: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
        Service_idService: true,
        Service_Provider_idService_Provider: true,
        createdAt: true,
        Images: {
          select: {
            imageUrl: true,
            order: true,
          },
        },
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    const imagesUrls = advertisement.Images.map((img) => ({
      url: img.imageUrl,
      order: img.order,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.advertisementArchive.create({
        data: {
          originalAdvertisementId: advertisement.idAdvertisement,
          title: advertisement.title,
          description: advertisement.description,
          price: advertisement.price,
          status: advertisement.status,
          startDate: advertisement.startDate,
          endDate: advertisement.endDate,
          createdAt: advertisement.createdAt,
          serviceStartTime: advertisement.serviceStartTime,
          serviceEndTime: advertisement.serviceEndTime,
          serviceId: advertisement.Service_idService,
          serviceProviderId: advertisement.Service_Provider_idService_Provider,
          imagesUrls: imagesUrls.length > 0 ? imagesUrls : Prisma.JsonNull,
        },
      });

      await tx.advertisementImage.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.feedback.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.archive.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      await tx.advertisement.delete({
        where: {
          idAdvertisement: idNum,
        },
      });
    });

    // Delete images from Firebase Storage
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (bucketName) {
      const bucket = getStorage().bucket(bucketName);
      for (const img of imagesUrls) {
        if (img.url) {
          const path = decodeURIComponent(
            img.url.split("/o/")[1]?.split("?")[0] || ""
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
      }
    } else {
      console.error("FIREBASE_STORAGE_BUCKET env var not set");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting advertisement:", error);
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
 * /api/admin/advertisements/{id}:
 *   delete:
 *     summary: Delete an advertisement (admin only)
 *     description: |
 *       Archives an advertisement by moving it to the AdvertisementArchive table and deletes it from the Advertisement table.
 *       Also deletes associated images from Firebase Storage, feedbacks, and archive records.
 *       This operation is irreversible for the original advertisement. Requires admin authentication via Firebase ID token.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the advertisement to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid advertisement ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid advertisement ID"
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
 *         description: Advertisement not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Advertisement not found"
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