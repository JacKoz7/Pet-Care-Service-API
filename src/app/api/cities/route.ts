// src/app/api/cities/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { withCors } from "@/lib/cors";

const prisma = new PrismaClient();

async function handler() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { idCity: "asc" },
    });
    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export const GET = withCors(handler);

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Retrieve a list of all cities
 *     description: Returns all cities ordered by their `idCity`.
 *     tags: [Cities]
 *     responses:
 *       200:
 *         description: A JSON object containing an array of cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idCity:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Warszawa"
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/city.jpg"
 *       500:
 *         description: Failed to fetch cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch cities"
 */
