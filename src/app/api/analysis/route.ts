import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

const SYSTEM_PROMPT = `You are a veterinary diagnosis assistant. You receive JSON input describing an animal and its symptoms. 
You must respond ONLY in JSON with the given schema. No other text, no explanations, no comments.

Schema:
{
  "overallHealth": "healthy" | "hard to tell" | "unhealthy",
  "diagnoses": [
    {
      "diseaseName": "string (in Polish)",
      "probability": number (0.0 to 1.0),
      "riskLevel": "low" | "medium" | "high",
      "description": "string (in Polish, max 200 chars)",
      "confidenceReasoning": "string (in Polish, max 280 chars)",
      "recommendedActions": ["string (in Polish)"],
      "recommendedTests": ["string (in Polish)"],
      "requiresVetVisit": boolean,
      "urgency": "immediate" | "within_24h" | "within_72h" | "within_week",
      "differential": ["string (in Polish)"]
    }
  ]
}

- overallHealth: Based on symptoms and pet details, assess overall health: "healthy" if no serious issues, "hard to tell" if mixed/unclear, "unhealthy" if high risks.
- Generate exactly 3 distinct diagnoses, sorted by probability descending. Use pet details and symptoms to infer likely conditions.`;

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
    const { petId, ...inputData } = body; // Extract petId and get the rest as inputData (without petId)

    // Validate inputData (now without petId, but check required fields) - symptoms are now optional
    if (!inputData) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    if (!petId) {
      return NextResponse.json(
        { error: "Pet ID is required" },
        { status: 400 }
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

    const pet = await prisma.pet.findUnique({
      where: {
        idPet: petId,
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
        { error: "You are not authorized to analyze this pet" },
        { status: 403 }
      );
    }

    // Log the inputData for AI (without petId)
    console.log("Input Data for AI:", JSON.stringify(inputData, null, 2));

    // Call Gemini API with inputData (without petId)
    const fullPrompt = `${SYSTEM_PROMPT}\n\nInput: ${JSON.stringify(
      inputData
    )}`;
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("Full AI response:", JSON.stringify(aiData, null, 2));

    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("Extracted content:", aiContent);

    if (!aiContent) {
      console.log("AI Response status:", aiResponse.status);
      console.log("AI Data:", JSON.stringify(aiData, null, 2));
      console.log("AI Candidates:", aiData.candidates);
      throw new Error("No response from AI");
    }

    // Parse JSON from AI response
    let diagnoses;
    try {
      const cleanedContent = aiContent.trim().replace(/```json\n?|\n?```/g, "");
      diagnoses = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(
        "Failed to parse AI response:",
        parseError,
        "Content:",
        aiContent
      );
      throw new Error("Invalid AI response format");
    }

    if (
      !diagnoses.diagnoses ||
      !Array.isArray(diagnoses.diagnoses) ||
      diagnoses.diagnoses.length !== 3 ||
      !["healthy", "hard to tell", "unhealthy"].includes(
        diagnoses.overallHealth
      )
    ) {
      throw new Error("AI response does not match required schema");
    }

    // NOWOŚĆ: Jeśli overallHealth === "healthy", ustaw isHealthy na true dla peta
    if (diagnoses.overallHealth === "healthy") {
      await prisma.pet.update({
        where: { idPet: petId },
        data: { isHealthy: true },
      });
      console.log(`Pet ${petId} marked as healthy.`);
    }

    // Save to database (original body with petId)
    const analysis = await prisma.analysis.create({
      data: {
        inputData: body, // Full body with petId for record
        diagnoses: diagnoses,
        Pet_idPet: petId,
      },
    });

    // Log analysis results including overallHealth
    console.log(
      "Analysis results (including overallHealth):",
      JSON.stringify(diagnoses, null, 2)
    );

    return NextResponse.json({
      success: true,
      analysisId: analysis.idAnalysis,
      diagnoses: diagnoses.diagnoses,
      overallHealth: diagnoses.overallHealth, // NOWOŚĆ: Zwróć overallHealth
    });
  } catch (error) {
    console.error("Error performing analysis:", error);
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
 * /api/analysis:
 *   post:
 *     summary: Perform pet diagnosis analysis
 *     description: |
 *       Performs AI-based diagnosis analysis for a pet based on provided input data.
 *       Requires a valid Firebase authentication token and ownership of the pet.
 *       Saves the analysis to the database.
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *             properties:
 *               petId:
 *                 type: integer
 *                 example: 1
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 example: 12
 *               sex:
 *                 type: string
 *                 enum: [MALE, FEMALE, UNKNOWN]
 *                 nullable: true
 *                 example: "MALE"
 *               isSterilized:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *               activityLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 nullable: true
 *                 example: "MEDIUM"
 *               dietType:
 *                 type: string
 *                 enum: [DRY, WET, BARF, HOMEMADE, OTHER]
 *                 nullable: true
 *                 example: "WET"
 *               knownAllergies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 example: ["peanuts"]
 *               vaccinationUpToDate:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *               environmentType:
 *                 type: string
 *                 enum: [INDOOR, OUTDOOR, MIXED]
 *                 nullable: true
 *                 example: "OUTDOOR"
 *               chronicDiseases:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 example: ["diabetes"]
 *               selectedSymptoms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     defaultSeverity:
 *                       type: string
 *                 # minItems removed - now optional
 *     responses:
 *       200:
 *         description: Analysis performed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 analysisId:
 *                   type: integer
 *                   example: 1
 *                 diagnoses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       diseaseName:
 *                         type: string
 *                         example: "Zapalenie żołądka"
 *                       probability:
 *                         type: number
 *                         example: 0.72
 *                       riskLevel:
 *                         type: string
 *                         enum: [low, medium, high]
 *                         example: "high"
 *                       description:
 *                         type: string
 *                         example: "Stan zapalny błony śluzowej żołądka powodujący wymioty i brak apetytu."
 *                       confidenceReasoning:
 *                         type: string
 *                         example: "Wymioty + brak apetytu + nowa karma tydzień temu; objawy pasują klinicznie."
 *                       recommendedActions:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Odstawić karmę na 12h", "Podawać małe porcje wody co 1-2h"]
 *                       recommendedTests:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Badanie kału", "Morfologia i biochemia krwi"]
 *                       requiresVetVisit:
 *                         type: boolean
 *                         example: true
 *                       urgency:
 *                         type: string
 *                         enum: [immediate, within_24h, within_72h, within_week]
 *                         example: "within_24h"
 *                       differential:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["zatrucie pokarmowe", "choroba wrzodowa"]
 *                 overallHealth:
 *                   type: string
 *                   enum: [healthy, hard to tell, unhealthy]
 *                   example: "healthy"
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not a client or not pet owner)
 *       404:
 *         description: User or pet not found
 *       500:
 *         description: Internal server error
 */

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

    const analyses = await prisma.analysis.findMany({
      where: {
        Pet: {
          Client: {
            idClient: {
              in: user.Clients.map((c) => c.idClient),
            },
          },
        },
      },
      select: {
        idAnalysis: true,
        createdAt: true,
        Pet: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const summaries = analyses.map((a) => ({
      idAnalysis: a.idAnalysis,
      createdAt: a.createdAt.toISOString(),
      petName: a.Pet.name,
    }));

    return NextResponse.json({
      analyses: summaries,
    });
  } catch (error) {
    console.error("Error fetching analyses:", error);
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
 * /api/analysis:
 *   get:
 *     summary: Get all pet diagnosis analyses for user
 *     description: Retrieves all analyses for the authenticated user's pets. Requires client role.
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analyses retrieved successfully
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
 *                         example: 1
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-12T12:00:00.000Z"
 *                       petName:
 *                         type: string
 *                         example: "Bella"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not client)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
