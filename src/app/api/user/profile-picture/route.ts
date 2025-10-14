import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.profilePictureUrl) {
      return NextResponse.json(
        { error: "Profile picture already set. Use PATCH to update." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    const bucket = getStorage().bucket(bucketName);
    const fileName = `profile_pictures/${user.idUser}_${Date.now()}_${
      file.name
    }`;
    const fileUpload = bucket.file(fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fileUpload.save(buffer, {
      metadata: { contentType: file.type },
    });

    const [url] = await fileUpload.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { profilePictureUrl: url },
    });

    return NextResponse.json({
      success: true,
      profilePictureUrl: url,
    });
  } catch (error) {
    console.error("Error setting profile picture:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.profilePictureUrl) {
      return NextResponse.json(
        { error: "No profile picture set. Use POST to set initial picture." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    const bucket = getStorage().bucket(bucketName);

    // Delete old image
    if (user.profilePictureUrl) {
      const oldPath = decodeURIComponent(
        user.profilePictureUrl.split("/o/")[1]?.split("?")[0] || ""
      );
      if (oldPath) {
        try {
          await bucket.file(oldPath).delete();
          console.log(`Deleted old image: ${oldPath}`);
        } catch (deleteErr) {
          console.error(`Failed to delete old image ${oldPath}:`, deleteErr);
          // Continue even if delete fails
        }
      }
    }

    // Upload new image
    const fileName = `profile_pictures/${user.idUser}_${Date.now()}_${
      file.name
    }`;
    const fileUpload = bucket.file(fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fileUpload.save(buffer, {
      metadata: { contentType: file.type },
    });

    const [url] = await fileUpload.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { profilePictureUrl: url },
    });

    return NextResponse.json({
      success: true,
      profilePictureUrl: url,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.profilePictureUrl) {
      return NextResponse.json(
        { error: "No profile picture set to delete" },
        { status: 400 }
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    const bucket = getStorage().bucket(bucketName);

    // Delete image from Firebase Storage
    const imagePath = decodeURIComponent(
      user.profilePictureUrl.split("/o/")[1]?.split("?")[0] || ""
    );
    if (imagePath) {
      try {
        await bucket.file(imagePath).delete();
        console.log(`Deleted profile picture from Storage: ${imagePath}`);
      } catch (deleteErr) {
        console.error(
          `Failed to delete profile picture ${imagePath}:`,
          deleteErr
        );
        // Continue even if delete fails
      }
    }

    // Update database to set profilePictureUrl to null
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { profilePictureUrl: null },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
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
 * /api/user/profile-picture:
 *   post:
 *     summary: Set the initial profile picture for the user
 *     description: Uploads a profile picture to Firebase Storage and saves the URL in the database. Only allowed if no picture is already set. Available only to authenticated users.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload (e.g., JPG, PNG)
 *     responses:
 *       200:
 *         description: Profile picture set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profilePictureUrl:
 *                   type: string
 *                   example: "https://storage.googleapis.com/bucket/profile_pictures/1_123456789_image.jpg?..."
 *       400:
 *         description: Bad request (no file provided or picture already set)
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update the user's profile picture
 *     description: Uploads a new profile picture to Firebase Storage, deletes the old one if exists, and updates the URL in the database. Available only to authenticated users with an existing picture.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The new image file to upload (e.g., JPG, PNG)
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profilePictureUrl:
 *                   type: string
 *                   example: "https://storage.googleapis.com/bucket/profile_pictures/1_123456789_newimage.jpg?..."
 *       400:
 *         description: Bad request (no file provided or no picture set)
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete the user's profile picture
 *     description: Deletes the profile picture from Firebase Storage and sets the URL to null in the database. Available only to authenticated users with an existing picture.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request (no picture set to delete)
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
