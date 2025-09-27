// src/app/api/advertisements/[id]/route.ts
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
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: idNum,
      },
      select: {
        idAdvertisement: true,
        title: true,
        description: true,
        price: true,
        status: true,
        startDate: true,
        endDate: true,
        serviceStartTime: true,
        serviceEndTime: true,
        Service_Provider: {
          select: {
            idService_Provider: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                City: true,
              },
            },
          },
        },
        Images: {
          select: {
            imageUrl: true,
            order: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        Service: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      advertisement: {
        id: advertisement.idAdvertisement,
        title: advertisement.title,
        description: advertisement.description,
        price: advertisement.price,
        status: advertisement.status,
        startDate: advertisement.startDate,
        endDate: advertisement.endDate,
        serviceStartTime: advertisement.serviceStartTime
          ? advertisement.serviceStartTime.toTimeString().slice(0, 5)
          : null,
        serviceEndTime: advertisement.serviceEndTime
          ? advertisement.serviceEndTime.toTimeString().slice(0, 5)
          : null,
        serviceProviderId: advertisement.Service_Provider.idService_Provider,
        service: advertisement.Service.name,
        provider: {
          firstName: advertisement.Service_Provider.User.firstName,
          lastName: advertisement.Service_Provider.User.lastName,
          phoneNumber: advertisement.Service_Provider.User.phoneNumber,
        },
        city: {
          idCity: advertisement.Service_Provider.User.City.idCity,
          name: advertisement.Service_Provider.User.City.name,
          imageUrl: advertisement.Service_Provider.User.City.imageUrl,
        },
        images: advertisement.Images.map((img) => ({
          imageUrl: img.imageUrl,
          order: img.order,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching advertisement by ID:", error);
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
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
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
        ServiceProviders: true, // All service providers, active or not
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.ServiceProviders.length === 0) {
      return NextResponse.json(
        { error: "User has no service provider association" },
        { status: 403 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: idNum,
      },
      select: {
        Service_Provider_idService_Provider: true,
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    const isOwner = user.ServiceProviders.some(
      (sp) =>
        sp.idService_Provider ===
        advertisement.Service_Provider_idService_Provider
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to delete this advertisement" },
        { status: 403 }
      );
    }

    // NEW: Use transaction to delete related records first to avoid FK violation
    await prisma.$transaction(async (tx) => {
      // Delete related images
      await tx.advertisementImage.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      // Delete related feedbacks
      await tx.feedback.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      // Delete related archives
      await tx.archive.deleteMany({
        where: {
          Advertisement_idAdvertisement: idNum,
        },
      });
      // Now delete the advertisement
      await tx.advertisement.delete({
        where: {
          idAdvertisement: idNum,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting advertisement:", error);
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
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get advertisement by ID
 *     description: |
 *       Returns detailed information for a specific advertisement by its ID.
 *       Includes service provider info (first name, last name, phone number), title, description, city, start date, end date, price, status, service name, and all images.
 *     tags: [Advertisements]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Advertisement ID
 *     responses:
 *       200:
 *         description: Advertisement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 advertisement:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Profesjonalne wyprowadzanie psów w centrum Warszawy"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "Oferuję profesjonalne wyprowadzanie psów..."
 *                     price:
 *                       type: number
 *                       nullable: true
 *                       example: 25.0
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE, PENDING]
 *                       example: "ACTIVE"
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-26T00:00:00Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2025-11-25T00:00:00Z"
 *                     serviceStartTime:
 *                       type: string
 *                       nullable: true
 *                       example: "09:00"
 *                     serviceEndTime:
 *                       type: string
 *                       nullable: true
 *                       example: "17:00"
 *                     service:
 *                       type: string
 *                       example: "Wyprowadzanie psów"
 *                     serviceProviderId:
 *                       type: integer
 *                       example: 1
 *                     provider:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                           nullable: true
 *                           example: "Jane"
 *                         lastName:
 *                           type: string
 *                           nullable: true
 *                           example: "Doe"
 *                         phoneNumber:
 *                           type: string
 *                           nullable: true
 *                           example: "123456789"
 *                     city:
 *                       type: object
 *                       properties:
 *                         idCity:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Warszawa"
 *                         imageUrl:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/city.jpg"
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           imageUrl:
 *                             type: string
 *                             example: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500"
 *                           order:
 *                             type: integer
 *                             nullable: true
 *                             example: 1
 *       400:
 *         description: Invalid advertisement ID
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete advertisement by ID
 *     description: |
 *       Deletes a specific advertisement by its ID.
 *       Requires authentication and authorization: the user must be associated with the service provider that owns the advertisement (active or inactive).
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Advertisement ID
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid advertisement ID
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (not associated with the owner)
 *       404:
 *         description: Advertisement or user not found
 *       500:
 *         description: Internal server error
 */
