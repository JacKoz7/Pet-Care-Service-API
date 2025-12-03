import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, email, firstName, lastName, phoneNumber, cityId } =
      body;

    if (!firebaseUid || !email || !cityId) {
      return NextResponse.json(
        { error: "Firebase UID, email, and cityId are required" },
        { status: 400 }
      );
    }

    if (
      phoneNumber &&
      (phoneNumber.length !== 9 || !/^\d+$/.test(phoneNumber))
    ) {
      return NextResponse.json(
        { error: "Phone number must be exactly 9 digits" },
        { status: 400 }
      );
    }

    const city = await prisma.city.findUnique({
      where: { idCity: Number(cityId) },
    });
    if (!city) {
      return NextResponse.json({ error: "Invalid city ID" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { firebaseUid: firebaseUid }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        firebaseUid: firebaseUid,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email,
        phoneNumber: phoneNumber || null,
        City_idCity: Number(cityId),
        lastActive: new Date(),
        isVerified: false,
      },
      include: {
        City: true,
      },
    });

    await prisma.client.create({
      data: {
        User_idUser: newUser.idUser,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.idUser,
        firebaseUid: newUser.firebaseUid,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        city: newUser.City,
        isVerified: newUser.isVerified,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}