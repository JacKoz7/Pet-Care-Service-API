// app/api/pets/species/route.ts
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

/**
 * @swagger
 * /api/pets/species:
 *   get:
 *     summary: Get all species
 *     description: Returns a list of all predefined species.
 *     tags: [Pets]
 *     responses:
 *       200:
 *         description: Species retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 species:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idSpiece:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Pies"
 *       500:
 *         description: Internal server error
 */
