import { POST } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    client: {
      create: jest.fn(),
    },
    advertisement: {
      findUnique: jest.fn(),
    },
    pet: {
      findMany: jest.fn(),
    },
    booking: {
      create: jest.fn(),
    },
    bookingPet: {
      createMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock Firebase Admin Auth
jest.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

// Define a type for the mocked Prisma client
type MockPrismaClient = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  client: {
    create: jest.Mock;
  };
  advertisement: {
    findUnique: jest.Mock;
  };
  pet: {
    findMany: jest.Mock;
  };
  booking: {
    create: jest.Mock;
  };
  bookingPet: {
    createMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/bookings POST", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: { authorization: "Invalid" },
      body: JSON.stringify({}),
    });

    // ACT
    const response = await POST(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(401);
    expect(data.error).toBe("Authorization header missing or invalid");
    expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it("should return 400 if required fields are missing", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const request = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: JSON.stringify({ petIds: [], message: "Test" }), // missing advertisementId, dates
    });

    // ACT
    const response = await POST(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields or invalid petIds");
  });

  it("should create booking successfully", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [],
      ServiceProviders: [],
    };

    const mockNewClient = { idClient: 1 };

    const mockAdvertisement = {
      idAdvertisement: 1,
      status: "ACTIVE",
      price: 100,
      Service_Provider: { idService_Provider: 2, isActive: true },
      Service_Provider_idService_Provider: 2,
    };

    const mockPets = [{ idPet: 1 }, { idPet: 2 }];

    const mockBooking = {
      idBooking: 1,
      startDateTime: new Date("2025-01-01T10:00:00"),
      endDateTime: new Date("2025-01-01T12:00:00"),
      message: "Test",
      Client_idClient: 1,
      Service_Provider_idService_Provider: 2,
      advertisementId: 1,
      price: 100,
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.client.create.mockResolvedValue(mockNewClient);
    mockPrisma.advertisement.findUnique.mockResolvedValue(mockAdvertisement);
    mockPrisma.pet.findMany.mockResolvedValue(mockPets);
    mockPrisma.booking.create.mockResolvedValue(mockBooking);
    mockPrisma.bookingPet.createMany.mockResolvedValue({ count: 2 });
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: JSON.stringify({
        petIds: [1, 2],
        advertisementId: 1,
        startDateTime: "2025-01-01T10:00:00",
        endDateTime: "2025-01-01T12:00:00",
        message: "Test",
      }),
    });

    // ACT
    const response = await POST(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.booking.idBooking).toBe(1);
    expect(mockPrisma.bookingPet.createMany).toHaveBeenCalledWith({
      data: [
        { Booking_idBooking: 1, Pet_idPet: 1 },
        { Booking_idBooking: 1, Pet_idPet: 2 },
      ],
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { idUser: 1 },
      data: { lastActive: expect.any(Date) },
    });
  });
});