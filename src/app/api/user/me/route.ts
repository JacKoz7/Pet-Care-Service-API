// src/app/api/user/me/route.ts (updated: add isVerified to GET response and update docs)

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
        City: true,
        Admin: true,
        ServiceProviders: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found. Please complete registration." },
        { status: 400 }
      );
    }

    // NEW: Check if email is verified in DB
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error:
            "Email not verified. Please verify your email to access your account.",
        },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.idUser,
        firebaseUid: user.firebaseUid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePictureUrl: user.profilePictureUrl,
        isVerified: user.isVerified,
        city: {
          idCity: user.City.idCity,
          name: user.City.name,
          imageUrl: user.City.imageUrl,
        },
        isAdmin: !!user.Admin,
        isServiceProvider: user.ServiceProviders.length > 0,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    console.error("Get user attributes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // NEW: Check if email is verified in DB before allowing updates
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error:
            "Email not verified. Please verify your email to update your profile.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phoneNumber, cityId } = body;

    // Validate input
    if (
      phoneNumber &&
      (phoneNumber.length !== 9 || !/^\d+$/.test(phoneNumber))
    ) {
      return NextResponse.json(
        { error: "Phone number must be exactly 9 digits" },
        { status: 400 }
      );
    }

    if (cityId !== undefined) {
      const cityExists = await prisma.city.findUnique({
        where: { idCity: Number(cityId) },
      });
      if (!cityExists) {
        return NextResponse.json({ error: "Invalid city ID" }, { status: 400 });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { idUser: user.idUser },
      data: {
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
        City_idCity: cityId !== undefined ? Number(cityId) : user.City_idCity,
      },
      include: {
        City: true,
        Admin: true,
        ServiceProviders: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.idUser,
        firebaseUid: updatedUser.firebaseUid,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePictureUrl: updatedUser.profilePictureUrl,
        city: {
          idCity: updatedUser.City.idCity,
          name: updatedUser.City.name,
          imageUrl: updatedUser.City.imageUrl,
        },
        isAdmin: !!updatedUser.Admin,
        isServiceProvider: updatedUser.ServiceProviders.length > 0,
        lastActive: updatedUser.lastActive,
      },
    });
  } catch (error) {
    console.error("Update user attributes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}