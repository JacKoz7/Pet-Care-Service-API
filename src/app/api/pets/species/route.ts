import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const species = await prisma.spiece.findMany({
      select: {
        idSpiece: true,
        name: true,
      },
      orderBy: {
        idSpiece: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      species,
    });
  } catch (error) {
    console.error("Error fetching species:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}