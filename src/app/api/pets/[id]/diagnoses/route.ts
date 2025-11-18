// app/api/pets/[id]/diagnoses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const petId = parseInt(id);
    if (isNaN(petId)) {
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
      include: { Clients: true },
    });

    if (!user || user.Clients.length === 0) {
      return NextResponse.json(
        { error: "User not found or not a client" },
        { status: 403 }
      );
    }

    const pet = await prisma.pet.findUnique({
      where: { idPet: petId },
      select: { Client_idClient: true },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const isOwner = user.Clients.some((c) => c.idClient === pet.Client_idClient);
    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to view diagnoses for this pet" },
        { status: 403 }
      );
    }

    const analyses = await prisma.analysis.findMany({
      where: { Pet_idPet: petId },
      select: {
        idAnalysis: true,
        createdAt: true,
        diagnoses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const results = analyses.map((a) => {
      const diagnoses = a.diagnoses as any;
      return {
        idAnalysis: a.idAnalysis,
        createdAt: a.createdAt.toISOString(),
        overallHealth: diagnoses.overallHealth || "hard to tell",
      };
    });

    return NextResponse.json({ analyses: results });
  } catch (error) {
    console.error("Error fetching pet diagnoses:", error);
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
 * /api/pets/{id}/diagnoses:
 *   get:
 *     summary: Get all diagnostic analyses for a specific pet
 *     description: Returns a list of all AI diagnostic analyses performed for the given pet. Only accessible by the pet owner.
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pet ID
 *     responses:
 *       200:
 *         description: List of diagnostic analyses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analyses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idAnalysis:
 *                         type: integer
 *                         example: 42
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-18T10:30:00.000Z"
 *                       overallHealth:
 *                         type: string
 *                         enum: [healthy, hard to tell, unhealthy]
 *                         example: "healthy"
 *       400:
 *         description: Invalid pet ID
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       403:
 *         description: Forbidden (not the pet owner)
 *       404:
 *         description: Pet not found
 *       500:
 *         description: Internal server error
 */