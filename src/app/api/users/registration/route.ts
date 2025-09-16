import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client"; 

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, email, firstName, lastName, phoneNumber, cityId } =
      body;

    // Walidacja wymaganych pól
    if (!firebaseUid || !email) {
      return NextResponse.json(
        { error: "Firebase UID and email are required" },
        { status: 400 }
      );
    }

    // Walidacja numeru telefonu (opcjonalna)
    if (
      phoneNumber &&
      (phoneNumber.length !== 9 || !/^\d+$/.test(phoneNumber))
    ) {
      return NextResponse.json(
        { error: "Phone number must be exactly 9 digits" },
        { status: 400 }
      );
    }

    // Sprawdź czy miasto istnieje (jeśli podano)
    if (cityId) {
      const city = await prisma.city.findUnique({
        where: { idCity: parseInt(cityId) },
      });
      if (!city) {
        return NextResponse.json({ error: "Invalid city ID" }, { status: 400 });
      }
    }

    // Sprawdź czy użytkownik już istnieje w bazie danych
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

    // Dodaj użytkownika do bazy danych
    const newUser = await prisma.user.create({
      data: {
        firebaseUid: firebaseUid,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email,
        phoneNumber: phoneNumber || null,
        City_idCity: cityId ? parseInt(cityId) : null,
        lastActive: new Date(),
      },
      include: {
        City: true,
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
