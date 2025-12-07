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
    booking: {
      findFirst: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
    findFirst: jest.Mock;
  };
  review: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/reviews POST", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if no or invalid auth header", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      headers: { authorization: "Invalid" },
      body: JSON.stringify({}),
    });

    // ACT
    const response = await POST(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(401);
    expect(data.error).toBe("You ain't got no auth header or it's fucked up, nigga");
    expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it("should return 400 if required fields missing", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    mockPrisma.user.findUnique.mockResolvedValue({
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [{ idClient: 1 }],
    });

    const request = new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: JSON.stringify({ comment: "Great service" }), // missing bookingId and rating
    });

    // ACT
    const response = await POST(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toBe("Need that booking ID and rating, nigga – don't play");
  });

  it("should create review successfully", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [{ idClient: 1 }],
    };

    const mockBooking = {
      idBooking: 123,
      Client_idClient: 1,
      Service_Provider_idService_Provider: 456,
      status: "PAID",
    };

    const mockReview = {
      idReview: 1,
      rating: 5,
      comment: "Great service",
      createdAt: new Date(),
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue(mockReview);
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: JSON.stringify({
        bookingId: 123,
        rating: 5,
        comment: "Great service",
      }),
    });

    // ACT
    const response = await POST(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review.rating).toBe(5);
    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: {
        rating: 5,
        comment: "Great service",
        Client_idClient: 1,
        Service_Provider_idService_Provider: 456,
        Booking_idBooking: 123,
      },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { idUser: 1 },
      data: { lastActive: expect.any(Date) },
    });
  });
});