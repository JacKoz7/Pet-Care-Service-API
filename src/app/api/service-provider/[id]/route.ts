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
  } catch (error) {
    console.error("Error fetching service provider profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}