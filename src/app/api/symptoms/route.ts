// src/app/api/symptoms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
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

    const symptoms = await prisma.symptom.findMany({
      orderBy: { idSymptom: "asc" },
    });

    return NextResponse.json({
      success: true,
      symptoms,
    });
  } catch (error) {
    console.error("Error fetching symptoms:", error);
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
 * /api/symptoms:
 *   get:
 *     summary: Retrieve a list of all symptoms
 *     description: |
 *       Returns all symptoms ordered by their `idSymptom`.
 *       Requires a valid Firebase authentication token and the user must be a client.
 *     tags: [Symptoms]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A JSON object containing an array of symptoms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 symptoms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idSymptom:
 *                         type: integer
 *                         example: 1
 *                       code:
 *                         type: string
 *                         example: "vomiting"
 *                       name:
 *                         type: string
 *                         example: "Wymioty"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "Zwracanie treści pokarmowej."
 *                       defaultSeverity:
 *                         type: string
 *                         example: "MODERATE"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not a client)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
