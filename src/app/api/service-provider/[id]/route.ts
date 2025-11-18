// src/app/api/service-provider/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = (await params) ? await params : { id: "" };
    const serviceProviderId = parseInt(id, 10);

    if (isNaN(serviceProviderId)) {
      return NextResponse.json(
        { error: "Invalid service provider ID" },
        { status: 400 }
      );
    }

    const serviceProvider = await prisma.service_Provider.findUnique({
      where: {
        idService_Provider: serviceProviderId,
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profilePictureUrl: true,
            City: {
              select: {
                name: true,
              },
            },
          },
        },
        Reviews: {
          // ← poprawna nazwa z Twojego schematu: Reviews (z dużej litery, liczba mnoga)
          include: {
            Client: {
              include: {
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!serviceProvider) {
      return NextResponse.json(
        { error: "Service provider not found" },
        { status: 404 }
      );
    }

    const reviews = serviceProvider.Reviews ?? [];
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return NextResponse.json({
      success: true,
      serviceProvider: {
        id: serviceProvider.idService_Provider,
        firstName: serviceProvider.User.firstName,
        lastName: serviceProvider.User.lastName,
        email: serviceProvider.User.email,
        phoneNumber: serviceProvider.User.phoneNumber,
        profilePictureUrl: serviceProvider.User.profilePictureUrl,
        city: serviceProvider.User.City?.name ?? null,
        isActive: serviceProvider.isActive,
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews: reviews.length,
        reviews: reviews.map((review) => ({
          id: review.idReview,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          clientName: `${review.Client.User.firstName} ${review.Client.User.lastName}`,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching service provider profile:", error);
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
 * /api/service-provider/{id}:
 *   get:
 *     summary: Get public service provider profile with all reviews
 *     description: Returns full public profile of a service provider including personal data, average rating and list of all client reviews. No auth required.
 *     tags: [Service Provider]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service Provider ID
 *         example: 5
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 serviceProvider:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     firstName: { type: string, nullable: true }
 *                     lastName: { type: string, nullable: true }
 *                     email: { type: string, nullable: true }
 *                     phone: { type: string, nullable: true }
 *                     profilePictureUrl: { type: string, nullable: true }
 *                     city: { type: string, nullable: true }
 *                     isActive: { type: boolean }
 *                     averageRating: { type: number, format: float, example: 4.7 }
 *                     totalReviews: { type: integer }
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           rating: { type: integer, minimum: 1, maximum: 5 }
 *                           comment: { type: string, nullable: true }
 *                           createdAt: { type: string, format: date-time }
 *                           clientName: { type: string }
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Service provider not found
 *       500:
 *         description: Internal server error
 */
