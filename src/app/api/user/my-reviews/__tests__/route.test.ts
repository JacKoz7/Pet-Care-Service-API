import { GET } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
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
  };
  review: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/client/reviews GET", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/client/reviews", {
      headers: { authorization: "Invalid" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it("should return 404 if user is not found or not a client", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/client/reviews", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found or not a client");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: "test-uid" },
      include: { Clients: true },
    });
  });

  it("should fetch user reviews successfully", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [{ idClient: 1 }],
    };

    const mockReview = {
      idReview: 1,
      rating: 5,
      comment: "Great service",
      createdAt: new Date(),
      Service_Provider: {
        User: {
          firstName: "Provider",
          lastName: "One",
          profilePictureUrl: "profile.jpg",
        },
      },
      Booking: {
        Advertisement: { title: "Test Ad" },
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.review.findMany.mockResolvedValue([mockReview]);

    const request = new NextRequest("http://localhost:3000/api/client/reviews", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reviews[0].rating).toBe(5);
    expect(data.reviews[0].serviceProvider.name).toBe("Provider One");
    expect(data.reviews[0].advertisementTitle).toBe("Test Ad");
    expect(data.total).toBe(1);
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
      where: { Client_idClient: 1 },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });
});