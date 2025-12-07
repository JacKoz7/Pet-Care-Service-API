import { GET } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    service_Provider: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Define a type for the mocked Prisma client
type MockPrismaClient = {
  service_Provider: {
    findUnique: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/service-providers/[id] GET", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 400 if ID is invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/service-providers/invalid");
    const context = { params: Promise.resolve({ id: "invalid" }) };

    // ACT
    const response = await GET(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid service provider ID");
    expect(mockPrisma.service_Provider.findUnique).not.toHaveBeenCalled();
  });

  it("should return 404 if service provider not found", async () => {
    // ARRANGE
    mockPrisma.service_Provider.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/service-providers/1");
    const context = { params: Promise.resolve({ id: "1" }) };

    // ACT
    const response = await GET(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(404);
    expect(data.error).toBe("Service provider not found");
    expect(mockPrisma.service_Provider.findUnique).toHaveBeenCalledWith({
      where: { idService_Provider: 1 },
      include: expect.any(Object),
    });
  });

  it("should return service provider successfully with average rating", async () => {
    // ARRANGE
    const mockServiceProvider = {
      idService_Provider: 1,
      isActive: true,
      User: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "123456789",
        profilePictureUrl: "profile.jpg",
        City: { name: "Warsaw" },
      },
      Reviews: [
        { idReview: 1, rating: 5, comment: "Great!", createdAt: new Date(), Client: { idClient: 1, User: { firstName: "Client", lastName: "One" } } },
        { idReview: 2, rating: 3, comment: "Okay", createdAt: new Date(), Client: { idClient: 2, User: { firstName: "Client", lastName: "Two" } } },
      ],
    };

    mockPrisma.service_Provider.findUnique.mockResolvedValue(mockServiceProvider);

    const request = new NextRequest("http://localhost:3000/api/service-providers/1");
    const context = { params: Promise.resolve({ id: "1" }) };

    // ACT
    const response = await GET(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.serviceProvider.averageRating).toBe(4.0);
    expect(data.serviceProvider.totalReviews).toBe(2);
    expect(data.serviceProvider.city).toBe("Warsaw");
    expect(mockPrisma.service_Provider.findUnique).toHaveBeenCalledWith({
      where: { idService_Provider: 1 },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profilePictureUrl: true,
            City: { select: { name: true } },
          },
        },
        Reviews: {
          include: {
            Client: {
              include: {
                User: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });
});