import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

async function getAuthenticatedClient(token: string) {
  const decodedToken = await adminAuth.verifyIdToken(token);
  const user = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
    include: { Clients: true },
  });

  if (!user || user.Clients.length === 0) return null;

  return {
    user,
    clientId: user.Clients[0].idClient,
  };
}

// ======================
// DELETE /api/reviews/{id}
// ======================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "You ain't logged in, who the fuck is you nigga?" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const clientData = await getAuthenticatedClient(token);
    if (!clientData) {
      return NextResponse.json(
        { error: "You ain't logged in, who the fuck is you nigga?" },
        { status: 401 }
      );
    }

    const reviewId = parseInt(params.id);
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: "ID lookin retarded, send a real number nigga" },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { idReview: reviewId },
      include: {
        Booking: {
          select: { Client_idClient: true },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Shit already ghost, can't find it" },
        { status: 404 }
      );
    }

    if (review.Client_idClient !== clientData.clientId) {
      return NextResponse.json(
        {
          error:
            "That ain't yo review nigga, touch it and you catch a permanent ban",
        },
        { status: 403 }
      );
    }

    await prisma.review.delete({
      where: { idReview: reviewId },
    });

    await prisma.user.update({
      where: { idUser: clientData.user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Server down bad, whole block bleedin' rn" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ======================
// PUT /api/reviews/{id}
// ======================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No token, who the fuck is you?" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const clientData = await getAuthenticatedClient(token);
    if (!clientData) {
      return NextResponse.json(
        { error: "No token, who the fuck is you?" },
        { status: 401 }
      );
    }

    const reviewId = parseInt(params.id);
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: "ID lookin retarded, send a real number nigga" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rating, comment } = body;

    if (rating === undefined && comment === undefined) {
      return NextResponse.json(
        { error: "Body missin rating or comment — fix that dumb shit nigga" },
        { status: 400 }
      );
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating gotta be 1-5, you wildin" },
        { status: 400 }
      );
    }

    const existingReview = await prisma.review.findUnique({
      where: { idReview: reviewId },
      include: { Booking: { select: { status: true } } },
    });

    if (!existingReview) {
      return NextResponse.json(
        { error: "That review already in the grave" },
        { status: 404 }
      );
    }

    if (existingReview.Client_idClient !== clientData.clientId) {
      return NextResponse.json(
        {
          error:
            "Tryna edit another nigga review? You bold as hell, get banned",
        },
        { status: 403 }
      );
    }

    const updatedReview = await prisma.review.update({
      where: { idReview: reviewId },
      data: {
        rating: rating !== undefined ? rating : existingReview.rating,
        comment:
          comment !== undefined ? comment || null : existingReview.comment,
      },
    });

    await prisma.user.update({
      where: { idUser: clientData.user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Review updated successfully",
      review: {
        id: updatedReview.idReview,
        rating: updatedReview.rating,
        comment: updatedReview.comment,
        createdAt: updatedReview.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Backend crashin out, trap house on fire rn" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}