// src/app/api/advertisements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
        { status: 400 }
      );
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: {
        idAdvertisement: id,
      },
      select: {
        idAdvertisement: true,
        title: true,
        description: true,
        price: true,
        status: true,
        startDate: true,
        endDate: true,
        Service_Provider: {
          include: {
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
 *                     service:
 *                       type: string
 *                       example: "Wyprowadzanie psów"
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
 */
