// src/app/api/user/my-reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const dbUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { Clients: true },
    });

    if (!dbUser || dbUser.Clients.length === 0) {
      return NextResponse.json(
        { error: "User not found or not a client" },
        { status: 404 }
      );
    }

    const clientId = dbUser.Clients[0].idClient;

    const reviews = await prisma.review.findMany({
      where: { Client_idClient: clientId },
      include: {
        Service_Provider: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        Booking: {
          include: {
            Advertisement: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedReviews = reviews.map((review) => ({
      id: review.idReview,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      serviceProvider: {
        name: `${review.Service_Provider.User.firstName} ${review.Service_Provider.User.lastName}`,
        profilePictureUrl: review.Service_Provider.User.profilePictureUrl,
      },
      advertisementTitle:
        review.Booking.Advertisement?.title || "Usługa usunięta",
    }));

    return NextResponse.json({
      success: true,
      reviews: formattedReviews,
      total: formattedReviews.length,
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
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
 * /api/user/my-reviews:
 *   get:
 *     summary: Get all reviews written by current user
 *     description: Returns list of all reviews that the authenticated client has written for service providers.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       rating: { type: integer, minimum: 1, maximum: 5 }
 *                       comment: { type: string, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                       serviceProvider:
 *                         type: object
 *                         properties:
 *                           name: { type: string }
 *                           profilePictureUrl: { type: string, nullable: true }
 *                       advertisementTitle: { type: string }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found or not a client
 *       500:
 *         description: Internal server error
 */
