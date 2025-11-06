// app/api/pets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

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

    const body = await request.json();
    const { name, age, description, images, speciesName } = body;

    // Basic validation
    if (
      !name ||
      !age ||
      !Array.isArray(images) ||
      images.length === 0 ||
      !speciesName
    ) {
      return NextResponse.json(
        { error: "Missing required fields or no images provided" },
        { status: 400 }
      );
    }

    // Validate age
    if (typeof age !== "number" || age < 0 || age > 999) {
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

    // Create pet
    const pet = await prisma.pet.create({
      data: {
        name,
        age,
        description: description || null,
        isHealthy: null,
        Spiece_idSpiece: spieceId,
        customSpeciesName,
        Client_idClient: clientId,
        Images: {
          create: images.map((img: { imageUrl: string; order?: number }) => ({
            imageUrl: img.imageUrl,
            order: img.order || 0,
          })),
        },
      },
      include: {
        Images: true,
      },
    });

    return NextResponse.json({
      success: true,
      pet,
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

/**
 * @swagger
 * /api/pets:
 *   get:
 *     summary: Get all pets for the authenticated user
 *     description: |
 *       Returns all pets for the authenticated user associated with any of their clients.
 *       Requires a valid Firebase authentication token.
 *     tags: [Pets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Max"
 *                       age:
 *                         type: number
 *                         example: 5
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "Friendly dog"
 *                       keyImage:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/pet.jpg"
 *                       species:
 *                         type: string
 *                         example: "Dog"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new pet
 *     description: |
 *       Creates a new pet for the authenticated user.
 *       Species is created if it doesn't exist.
 *       Requires a valid Firebase authentication token.
 *       At least one image must be provided.
 *     tags: [Pets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - age
 *               - images
 *               - speciesName
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Max"
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999
 *                 example: 5
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Friendly dog"
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       example: "https://example.com/pet.jpg"
 *                     order:
 *                       type: integer
 *                       example: 1
 *               speciesName:
 *                 type: string
 *                 example: "Dog"
 *     responses:
 *       200:
 *         description: Pet created successfully
 *       400:
 *         description: Missing required fields, no images provided, or invalid age
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User or client not found
 *       409:
 *         description: Conflict (pet with this name already exists for the user)
 *       500:
 *         description: Internal server error
 */
