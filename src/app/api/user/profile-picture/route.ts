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
      const oldPath = extractPathFromSignedUrl(user.profilePictureUrl);
      console.log("PATCH: Attempting to delete old image path:", oldPath); // Added log
      console.log("PATCH: Full URL:", user.profilePictureUrl); // Added log
      if (oldPath) {
        try {
          const [exists] = await bucket.file(oldPath).exists(); // Check if exists
          console.log("PATCH: File exists:", exists); // Added log
          if (exists) {
            await bucket.file(oldPath).delete();
            console.log(`PATCH: Deleted old image: ${oldPath}`);
          } else {
            console.log(`PATCH: File not found in storage: ${oldPath}`);
          }
        } catch (deleteErr) {
          console.error(
            `PATCH: Failed to delete old image ${oldPath}:`,
            deleteErr
          );
          // Continue even if delete fails
        }
      } else {
        console.log("PATCH: Could not extract old image path from URL");
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
      console.error("DELETE: Storage bucket not configured"); // Added log
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    console.log("DELETE: Bucket name:", bucketName); // Added log

    const bucket = getStorage().bucket(bucketName);

    // Delete image from Firebase Storage
    const imagePath = extractPathFromSignedUrl(user.profilePictureUrl);
    console.log("DELETE: Attempting to delete image path:", imagePath); // Added log
    console.log("DELETE: Full URL:", user.profilePictureUrl); // Added log
    if (imagePath) {
      try {
        const [exists] = await bucket.file(imagePath).exists(); // Check if exists
        console.log("DELETE: File exists:", exists); // Added log
        if (exists) {
          await bucket.file(imagePath).delete();
          console.log(
            `DELETE: Deleted profile picture from Storage: ${imagePath}`
          );
        } else {
          console.log(`DELETE: File not found in storage: ${imagePath}`);
          // Optionally return error if file not found
          return NextResponse.json(
            { error: "Profile picture file not found in storage" },
            { status: 404 }
          );
        }
      } catch (deleteErr) {
        console.error(
          `DELETE: Failed to delete profile picture ${imagePath}:`,
          deleteErr
        );
        // Optionally throw to fail the operation
        // throw deleteErr;
        // For now, continue but log
      }
    } else {
      console.error("DELETE: Could not extract image path from URL");
      return NextResponse.json(
        { error: "Invalid profile picture URL" },
        { status: 400 }
      );
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

function extractPathFromSignedUrl(url: string): string | null {
  try {
    // Match the pattern: https://storage.googleapis.com/{bucket}/{path}?params
    const match = url.match(
      /https:\/\/storage\.googleapis\.com\/[^\/]+\/(.+?)\?/
    );
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (error) {
    console.error("Error extracting path from URL:", error);
    return null;
  }
}