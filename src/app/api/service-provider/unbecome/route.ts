// src/app/api/user/remove-service-provider/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '@/lib/firebaseAdmin';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if user exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        ServiceProviders: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a service provider
    if (!existingUser.ServiceProviders || existingUser.ServiceProviders.length === 0) {
      return NextResponse.json({ error: 'User is not a service provider' }, { status: 400 });
    }

    // Delete service provider record(s)
    await prisma.service_Provider.deleteMany({
      where: { User_idUser: existingUser.idUser },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Service provider role removed successfully'
    });
  } catch (error) {
    console.error('Error removing service provider role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * @swagger
 * /api/service-provider/unbecome:
 *   delete:
 *     summary: Remove service provider role
 *     description: |
 *       Removes the service provider role from the currently authenticated user.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       User must currently be a service provider.
 *     tags: [Service Provider]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Service provider role removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Service provider role removed successfully"
 *       400:
 *         description: Bad request (user is not a service provider)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */