// app/api/pets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

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
        Breed: {
          include: {
            Spiece: true,
          },
        },
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
        species: pet.Breed.Spiece.name,
        breed: pet.Breed.name,
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

    const body = await request.json();
    const { name, age, description, images, speciesName, breedName } = body;

    // Basic validation
    if (
      !name ||
      !age ||
      !Array.isArray(images) ||
      images.length === 0 ||
      !speciesName ||
      !breedName
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

    // Find or create Spiece
    let spiece = await prisma.spiece.findUnique({
      where: { name: speciesName },
    });
    if (!spiece) {
      spiece = await prisma.spiece.create({
        data: { name: speciesName },
      });
    }
    const spieceId = spiece.idSpiece;

    // Find or create Breed
    let breed = await prisma.breed.findFirst({
      where: {
        name: breedName,
        Spiece_idSpiece: spieceId,
      },
    });
    if (!breed) {
      breed = await prisma.breed.create({
        data: {
          name: breedName,
          Spiece_idSpiece: spieceId,
        },
      });
    }
    const breedId = breed.idBreed;

    await prisma.$transaction(async (tx) => {
      await tx.petImage.deleteMany({
        where: {
          Pet_idPet: idNum,
        },
      });

      if (images && Array.isArray(images)) {
        for (const img of images) {
          await tx.petImage.create({
            data: {
              imageUrl: img.imageUrl,
              order: img.order,
              Pet_idPet: idNum,
            },
          });
        }
      }

      await tx.pet.update({
        where: {
          idPet: idNum,
        },
        data: {
          name,
          age,
          description: description || null,
          Breed_idBreed: breedId,
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

export async function DELETE(
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
        Clients: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.Clients.length === 0) {
      return NextResponse.json(
        { error: "User has no client association" },
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
        { error: "You are not authorized to delete this pet" },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.petImage.deleteMany({
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
 * /api/pets/{id}:
 *   get:
 *     summary: Get a pet by ID
 *     description: Returns detailed information about a specific pet including images, breed, and species.
 *     tags: [Pets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The pet ID
 *     responses:
 *       200:
 *         description: Pet details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pet:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Max"
 *                     age:
 *                       type: number
 *                       example: 5
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "Friendly dog"
 *                     species:
 *                       type: string
 *                       example: "Dog"
 *                     breed:
 *                       type: string
 *                       example: "Labrador"
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           imageUrl:
 *                             type: string
 *                             example: "https://example.com/pet.jpg"
 *                           order:
 *                             type: integer
 *                             nullable: true
 *                             example: 1
 *       400:
 *         description: Invalid pet ID
 *       404:
 *         description: Pet not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update a pet
 *     description: |
 *       Updates an existing pet's information. Only the pet owner can update the pet.
 *       Requires a valid Firebase authentication token.
 *       Species and breed are created if they don't exist.
 *       At least one image must be provided.
 *     tags: [Pets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The pet ID
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
 *               - breedName
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
 *               breedName:
 *                 type: string
 *                 example: "Labrador"
 *     responses:
 *       200:
 *         description: Pet updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing required fields, no images provided, invalid pet ID, or invalid age
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not the pet owner or not a client)
 *       404:
 *         description: Pet not found or user not found
 *       409:
 *         description: Conflict (pet with this name already exists for the user)
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a pet
 *     description: |
 *       Deletes an existing pet and all associated data (images, archives).
 *       Only the pet owner can delete the pet.
 *       Requires a valid Firebase authentication token.
 *     tags: [Pets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The pet ID
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
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not the pet owner or has no client association)
 *       404:
 *         description: Pet not found or user not found
 *       500:
 *         description: Internal server error
 */
