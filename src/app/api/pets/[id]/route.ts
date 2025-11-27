import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid pet ID" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({
      where: {
        idPet: idNum,
      },
      include: {
        Spiece: true,
        Images: {
          select: {
            imageUrl: true,
            order: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        Client: {
          select: {
            idClient: true,
          },
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pet: {
        id: pet.idPet,
        name: pet.name,
        age: pet.age,
        description: pet.description,
        species: pet.customSpeciesName || pet.Spiece.name,
        images: pet.Images.map((img) => ({
          imageUrl: img.imageUrl,
          order: img.order,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching pet by ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid pet ID" }, { status: 400 });
    }

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
      include: {
        Clients: {
          select: {
            idClient: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.Clients.length === 0) {
      return NextResponse.json(
        { error: "User is not a client" },
        { status: 403 }
      );
    }

    const pet = await prisma.pet.findUnique({
      where: {
        idPet: idNum,
      },
      select: {
        Client_idClient: true,
      },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const isOwner = user.Clients.some(
      (client) => client.idClient === pet.Client_idClient
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to update this pet" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const ageStr = formData.get("age") as string;
    const description = (formData.get("description") as string) || null;
    const speciesName = formData.get("speciesName") as string;
    const keepImageUrlsStr = formData.get("keepImageUrls") as string;
    let keepImageUrls: string[] = [];
    try {
      keepImageUrls = JSON.parse(keepImageUrlsStr || "[]");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      keepImageUrls = [];
    }
    const newFiles = formData.getAll("newImages") as File[];

    const totalImages = keepImageUrls.length + newFiles.length;

    // Basic validation
    if (!name || !ageStr || totalImages === 0 || !speciesName) {
      return NextResponse.json(
        { error: "Missing required fields or no images provided" },
        { status: 400 }
      );
    }

    // Validate age
    const age = parseInt(ageStr);
    if (isNaN(age) || age < 0 || age > 999) {
      return NextResponse.json(
        { error: "Age must be a non-negative integer up to 999" },
        { status: 400 }
      );
    }

    // Find or create Spiece
    let spiece = await prisma.spiece.findUnique({
      where: { name: speciesName },
    });
    let customSpeciesName = null;
    if (!spiece) {
      spiece = await prisma.spiece.findUnique({ where: { name: "Inne" } });
      if (!spiece) {
        throw new Error("Special species 'Inne' not found");
      }
      customSpeciesName = speciesName;
    }
    const spieceId = spiece.idSpiece;

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    const bucket = getStorage().bucket(bucketName);

    // Get old images and delete unkept from storage
    const oldPetImages = await prisma.petImage.findMany({
      where: { Pet_idPet: idNum },
      select: { imageUrl: true },
    });
    const oldUrls = oldPetImages.map((i) => i.imageUrl);
    const toDeleteUrls = oldUrls.filter((url) => !keepImageUrls.includes(url));

    for (const url of toDeleteUrls) {
      const oldPath = extractPathFromSignedUrl(url);
      if (oldPath) {
        try {
          const [exists] = await bucket.file(oldPath).exists();
          if (exists) {
            await bucket.file(oldPath).delete();
            console.log(`Deleted old image: ${oldPath}`);
          }
        } catch (deleteErr) {
          console.error(`Failed to delete old image ${oldPath}:`, deleteErr);
        }
      }
    }

    // Upload new images
    const uploadedNewUrls: string[] = [];
    for (const file of newFiles) {
      const fileName = `pets/${decodedToken.uid}/${Date.now()}_${file.name}`;
      const fileUpload = bucket.file(fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fileUpload.save(buffer, {
        metadata: { contentType: file.type },
      });

      const [url] = await fileUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      uploadedNewUrls.push(url);
    }

    // Transaction: delete all DB images, create new ones, update pet
    await prisma.$transaction(async (tx) => {
      await tx.petImage.deleteMany({
        where: {
          Pet_idPet: idNum,
        },
      });

      let currentOrder = 1;

      // Create kept images
      for (const url of keepImageUrls) {
        await tx.petImage.create({
          data: {
            imageUrl: url,
            order: currentOrder++,
            Pet_idPet: idNum,
          },
        });
      }

      // Create new images
      for (const url of uploadedNewUrls) {
        await tx.petImage.create({
          data: {
            imageUrl: url,
            order: currentOrder++,
            Pet_idPet: idNum,
          },
        });
      }

      await tx.pet.update({
        where: {
          idPet: idNum,
        },
        data: {
          name,
          age,
          description,
          isHealthy: null,
          Spiece_idSpiece: spieceId,
          customSpeciesName,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating pet:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "A pet with this name already exists for your account",
        },
        { status: 409 }
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