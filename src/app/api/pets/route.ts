import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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
      include: {
        Clients: {
          include: {
            Pets: {
              include: {
                Spiece: true,
                Images: {
                  orderBy: {
                    order: "asc",
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Collect all pets from all clients
    const pets = user.Clients.flatMap((client) =>
      client.Pets.map((pet) => ({
        id: pet.idPet,
        name: pet.name,
        age: pet.age,
        description: pet.description,
        keyImage: pet.Images[0]?.imageUrl || null,
        species: pet.customSpeciesName || pet.Spiece.name,
        isHealthy: pet.isHealthy,
      }))
    );

    // Update lastActive
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      pets,
    });
  } catch (error) {
    console.error("Error fetching user pets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

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

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const ageStr = formData.get("age") as string;
    const description = (formData.get("description") as string) || null;
    const speciesName = formData.get("speciesName") as string;
    const files = formData.getAll("images") as File[];

    // Basic validation
    if (
      !name ||
      !ageStr ||
      !Array.isArray(files) ||
      files.length === 0 ||
      !speciesName
    ) {
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        Clients: true,
      },
    });

    if (!user || user.Clients.length === 0) {
      return NextResponse.json(
        { error: "User or client not found" },
        { status: 404 }
      );
    }

    const clientId = user.Clients[0].idClient;

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
    const uploadedUrls: string[] = [];

    for (const file of files) {
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

      uploadedUrls.push(url);
    }

    // Create pet
    const pet = await prisma.pet.create({
      data: {
        name,
        age,
        description,
        isHealthy: null,
        Spiece_idSpiece: spieceId,
        customSpeciesName,
        Client_idClient: clientId,
        Images: {
          create: uploadedUrls.map((url, i) => ({
            imageUrl: url,
            order: i + 1,
          })),
        },
      },
      include: {
        Images: true,
        Spiece: true,
      },
    });

    return NextResponse.json({
      success: true,
      pet: {
        id: pet.idPet,
        name: pet.name,
        age: pet.age,
        description: pet.description,
        keyImage: pet.Images[0]?.imageUrl || null,
        species: pet.customSpeciesName || pet.Spiece.name,
        isHealthy: pet.isHealthy,
      },
    });
  } catch (error: unknown) {
    console.error("Error creating pet:", error);
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