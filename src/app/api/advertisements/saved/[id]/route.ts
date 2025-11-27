import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { adminAuth } from "@/lib/firebaseAdmin";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Resolve the params promise
    const resolvedParams = await params;
    const advertisementId = parseInt(resolvedParams.id);

    if (isNaN(advertisementId)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
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

    let clientId;
    if (user.Clients.length === 0) {
      // Create a new Client if none exists
      const newClient = await prisma.client.create({
        data: {
          User_idUser: user.idUser,
        },
      });
      clientId = newClient.idClient;
    } else {
      // Use the first Client
      clientId = user.Clients[0].idClient;
    }

    const advertisement = await prisma.advertisement.findUnique({
      where: { idAdvertisement: advertisementId },
    });

    if (!advertisement) {
      return NextResponse.json(
        { error: "Advertisement not found" },
        { status: 404 }
      );
    }

    await prisma.savedAdvertisement.create({
      data: {
        Client_idClient: clientId,
        Advertisement_idAdvertisement: advertisementId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error saving advertisement:", error);
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

    // Resolve the params promise
    const resolvedParams = await params;
    const advertisementId = parseInt(resolvedParams.id);

    if (isNaN(advertisementId)) {
      return NextResponse.json(
        { error: "Invalid advertisement ID" },
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
        { error: "User has no client association" },
        { status: 403 }
      );
    }

    const clientId = user.Clients[0].idClient;

    const deleted = await prisma.savedAdvertisement.deleteMany({
      where: {
        Client_idClient: clientId,
        Advertisement_idAdvertisement: advertisementId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Saved advertisement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error removing saved advertisement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
