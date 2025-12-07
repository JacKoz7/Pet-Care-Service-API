import { GET } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      update: jest.fn(),
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
  booking: {
    findMany: jest.Mock;
    update: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/provider/bookings GET", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/provider/bookings", {
      headers: { authorization: "Invalid" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(401);
    expect(data.error).toBe("Authorization header missing or invalid");
    expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it("should return 403 if user is not an active service provider", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    mockPrisma.user.findUnique.mockResolvedValue({
      idUser: 1,
      firebaseUid: "test-uid",
      ServiceProviders: [],
    });

    const request = new NextRequest("http://localhost:3000/api/provider/bookings", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(403);
    expect(data.error).toBe("User is not an active service provider");
  });

  it("should fetch and format provider bookings successfully", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      ServiceProviders: [{ idService_Provider: 1, isActive: true }],
    };

    const mockBooking = {
      idBooking: 1,
      status: "PENDING",
      startDateTime: new Date("2025-01-01T10:00:00"),
      endDateTime: new Date("2025-01-01T12:00:00"),
      message: "Test",
      advertisementId: 1,
      updatedAt: new Date(),
      Pets: [
        {
          Pet: {
            idPet: 1,
            name: "Pet1",
            age: 2,
            description: "Test pet",
            chronicDiseases: null,
            isHealthy: true,
            customSpeciesName: null,
            Spiece: { name: "Dog" },
            Images: [{ imageUrl: "pet.jpg" }],
          },
        },
      ],
      Advertisement: {
        title: "Test Ad",
        price: 100,
        serviceStartTime: "10:00",
        serviceEndTime: "12:00",
        Images: [{ imageUrl: "ad.jpg" }],
      },
      Client: {
        User: {
          firstName: "Client",
          lastName: "One",
          email: "client@example.com",
          phoneNumber: "987654321",
          City: { name: "Krakow" },
        },
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.booking.findMany.mockResolvedValue([mockBooking]);
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/provider/bookings", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.bookings[0].status).toBe("PENDING");
    expect(data.bookings[0].pets[0].name).toBe("Pet1");
    expect(data.bookings[0].client.city).toBe("Krakow");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { idUser: 1 },
      data: { lastActive: expect.any(Date) },
    });
  });
});