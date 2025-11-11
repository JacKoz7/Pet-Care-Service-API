// Nowy endpoint: api/analysis/[id].ts (już istnieje, więc dodajemy DELETE handler)

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";
import { JsonObject } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

interface DiagnosesJson extends JsonObject {
  overallHealth: "healthy" | "hard to tell" | "unhealthy";
  diagnoses: Array<{
    diseaseName: string;
    probability: number;
    riskLevel: "low" | "medium" | "high";
    description: string;
    confidenceReasoning: string;
    recommendedActions: string[];
    recommendedTests: string[];
    requiresVetVisit: boolean;
    urgency: "immediate" | "within_24h" | "within_72h" | "within_week";
    differential: string[];
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Dodano Promise<> dla Next.js 15+
) {
  try {
    const { id } = await params; // Await params!
    const analysisId = parseInt(id);
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysis ID" },
        { status: 400 }
      );
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
        { error: "User is not a client" },
        { status: 403 }
      );
    }

    const analysis = await prisma.analysis.findUnique({
      where: { idAnalysis: analysisId },
      include: {
        Pet: {
          include: {
            Client: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Sprawdź, czy user jest właścicielem pet
    const isOwner = user.Clients.some(
      (client) => client.idClient === analysis.Pet.Client_idClient
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to view this analysis" },
        { status: 403 }
      );
    }

    // Zwróć dane bez wrażliwych info z Pet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { Pet: _Pet, ...safeAnalysis } = analysis; // _Pet: unused intentionally (security)

    // FIX: Type guard i assertion dla Json (może być null lub nie obiekt)
    if (!safeAnalysis.diagnoses || typeof safeAnalysis.diagnoses !== "object") {
      return NextResponse.json(
        { error: "Invalid diagnoses data" },
        { status: 500 }
      );
    }

    const diagnosesData = safeAnalysis.diagnoses as DiagnosesJson;
    if (!diagnosesData.diagnoses || !Array.isArray(diagnosesData.diagnoses)) {
      return NextResponse.json(
        { error: "Invalid diagnoses format" },
        { status: 500 }
      );
    }

    // Teraz diagnosesData.diagnoses jest array!
    return NextResponse.json({
      idAnalysis: safeAnalysis.idAnalysis,
      createdAt: analysis.createdAt.toISOString(),
      overallHealth: diagnosesData.overallHealth,
      diagnoses: diagnosesData.diagnoses,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
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
    const analysisId = parseInt(id);
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysis ID" },
        { status: 400 }
      );
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
        { error: "User is not a client" },
        { status: 403 }
      );
    }

    const analysis = await prisma.analysis.findUnique({
      where: { idAnalysis: analysisId },
      include: {
        Pet: {
          include: {
            Client: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    const isOwner = user.Clients.some(
      (client) => client.idClient === analysis.Pet.Client_idClient
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to delete this analysis" },
        { status: 403 }
      );
    }

    await prisma.analysis.delete({
      where: { idAnalysis: analysisId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting analysis:", error);
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
 * /api/analysis/{id}:
 *   get:
 *     summary: Get pet diagnosis analysis results
 *     description: Retrieves a specific analysis by ID. Requires authentication and ownership of the pet.
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idAnalysis:
 *                   type: integer
 *                   example: 1
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-12T12:00:00.000Z"
 *                 overallHealth:
 *                   type: string
 *                   enum: [healthy, hard to tell, unhealthy]
 *                   example: "healthy"
 *                 diagnoses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Diagnosis'
 *       400:
 *         description: Invalid analysis ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner)
 *       404:
 *         description: Analysis not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete pet diagnosis analysis
 *     description: Deletes a specific analysis by ID. Requires authentication and ownership of the pet.
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid analysis ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner)
 *       404:
 *         description: Analysis not found
 *       500:
 *         description: Internal server error
 * components:
 *   schemas:
 *     Diagnosis:
 *       type: object
 *       properties:
 *         diseaseName:
 *           type: string
 *           example: "Zapalenie żołądka"
 *         probability:
 *           type: number
 *           example: 0.72
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 *           example: "high"
 *         description:
 *           type: string
 *           example: "Stan zapalny błony śluzowej żołądka..."
 *         confidenceReasoning:
 *           type: string
 *           example: "Wymioty + brak apetytu..."
 *         recommendedActions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Odstawić karmę na 12h"]
 *         recommendedTests:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Badanie kału"]
 *         requiresVetVisit:
 *           type: boolean
 *           example: true
 *         urgency:
 *           type: string
 *           enum: [immediate, within_24h, within_72h, within_week]
 *           example: "within_24h"
 *         differential:
 *           type: array
 *           items:
 *             type: string
 *           example: ["zatrucie pokarmowe"]
 */
