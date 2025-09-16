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

    // Sprawdź, czy email to ADMIN_EMAIL z .env.local i utwórz Admina jeśli tak
    if (email === process.env.ADMIN_EMAIL) {
      await prisma.admin.create({
        data: {
          User_idUser: newUser.idUser,
        },
      });
    }

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

/**
 * @swagger
 * /api/user/attributes:
 *   post:
 *     summary: Register a new user profile
 *     description: |
 *       Creates a new user in the database with attributes such as name, surname, phone number, and city.
 *       Authentication and password management are handled by Firebase — this endpoint only stores the user's Firebase UID and profile data.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firebaseUid
 *               - email
 *             properties:
 *               firebaseUid:
 *                 type: string
 *                 description: Firebase UID of the user (from Firebase Auth)
 *                 example: "abcd1234efgh5678"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email (must be unique)
 *                 example: "jane.doe@example.com"
 *               firstName:
 *                 type: string
 *                 description: Optional first name
 *                 example: "Jane"
 *               lastName:
 *                 type: string
 *                 description: Optional last name
 *                 example: "Doe"
 *               phoneNumber:
 *                 type: string
 *                 description: Optional 9-digit phone number
 *                 example: "123456789"
 *               cityId:
 *                 type: integer
 *                 description: Optional ID of the city (foreign key)
 *                 example: 1
 *     responses:
 *       200:
 *         description: User profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     firebaseUid:
 *                       type: string
 *                       example: "abcd1234efgh5678"
 *                     firstName:
 *                       type: string
 *                       nullable: true
 *                       example: "Jane"
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                       example: "123456789"
 *                     city:
 *                       type: object
 *                       nullable: true
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
 *       400:
 *         description: Invalid input (missing required fields, invalid phone number, or city not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Firebase UID and email are required"
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User already exists"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */