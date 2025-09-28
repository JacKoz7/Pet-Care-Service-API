import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     description: |
 *       Returns a list of all available services in the system, sorted alphabetically by name.
 *       Each service includes its ID and name. This endpoint does not require authentication.
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idService:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Wyprowadzanie psów"
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      select: {
        idService: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}