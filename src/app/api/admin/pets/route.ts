import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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
    } catch {
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    // Validate pagination
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "Invalid page size" }, { status: 400 });
    }

    const where: Prisma.PetWhereInput = {};

    if (search) {
      where.OR = [{ name: { contains: search, mode: "insensitive" } }];
    }

    // Fetch total count
    const totalPets = await prisma.pet.count({ where });

    // Fetch pets with pagination
    const pets = await prisma.pet.findMany({
      where,
      include: {
        Spiece: true,
        Images: {
          select: {
            imageUrl: true,
          },
          orderBy: {
            order: "asc",
          },
          take: 1,
        },
        Client: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { idPet: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const formattedPets = pets.map((pet) => ({
      id: pet.idPet,
      name: pet.name,
      age: pet.age,
      description: pet.description,
      species: pet.customSpeciesName || pet.Spiece.name,
      breed: null, // Breed is not available in the schema
      keyImage: pet.Images[0]?.imageUrl || null,
      owner: pet.Client
        ? {
            firstName: pet.Client.User.firstName,
            lastName: pet.Client.User.lastName,
            email: pet.Client.User.email,
          }
        : null,
      isHealthy: pet.isHealthy,
    }));

    return NextResponse.json({
      success: true,
      pets: formattedPets,
      pagination: {
        page,
        pageSize,
        total: totalPets,
        totalPages: Math.ceil(totalPets / pageSize),
      },
    });
  } catch (error) {
    console.error("Get pets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}