import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const advertisementId = parseInt(params.id);
    if (isNaN(advertisementId)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: { User_idUser: user.idUser },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: { idAdvertisement: advertisementId },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    await prisma.savedAdvertisement.create({
      data: {
        Client_idClient: client.idClient,
        Advertisement_idAdvertisement: advertisementId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error saving advertisement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const advertisementId = parseInt(params.id);
    if (isNaN(advertisementId)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: { User_idUser: user.idUser },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const deleted = await prisma.savedAdvertisement.deleteMany({
      where: {
        Client_idClient: client.idClient,
        Advertisement_idAdvertisement: advertisementId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Saved advertisement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error removing saved advertisement:", error);
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
 * /api/advertisements/saved/{id}:
 *   post:
 *     summary: Save an advertisement for the authenticated client
 *     description: |
 *       Saves the specified advertisement for the authenticated user (client).
 *       Requires a valid Firebase authentication token.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the advertisement to save
 *     responses:
 *       200:
 *         description: Advertisement saved successfully
 *       400:
 *         description: Invalid advertisement ID
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User, client, or advertisement not found
 *       409:
 *         description: Advertisement already saved
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Remove a saved advertisement for the authenticated client
 *     description: |
 *       Removes the specified saved advertisement for the authenticated user (client).
 *       Requires a valid Firebase authentication token.
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the advertisement to remove from saved
 *     responses:
 *       200:
 *         description: Saved advertisement removed successfully
 *       400:
 *         description: Invalid advertisement ID
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User, client, or saved advertisement not found
 *       500:
 *         description: Internal server error
 */
