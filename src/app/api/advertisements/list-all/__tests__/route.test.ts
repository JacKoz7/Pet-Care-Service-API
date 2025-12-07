import { GET } from "../route";
import { PrismaClient } from "@prisma/client";

// Mock Prisma Client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    advertisement: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

// Type for mocked Prisma client
type MockPrismaClient = {
  advertisement: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/advertisements GET", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return active advertisements successfully", async () => {
    // ARRANGE
    const mockAdvertisements = [
      {
        idAdvertisement: 1,
        title: "Test Ad",
        price: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        serviceStartTime: new Date("1970-01-01T10:00:00"),
        serviceEndTime: new Date("1970-01-01T12:00:00"),
        Service: { idService: 1, name: "Walking" },
        Images: [{ imageUrl: "ad.jpg" }],
        AdvertisementSpieces: [{ spiece: { name: "Dog" } }],
        Service_Provider: {
          User: {
            City: { idCity: 1, name: "Warsaw", imageUrl: "warsaw.jpg" },
          },
        },
        createdAt: new Date(),
      },
    ];

    mockPrisma.advertisement.findMany.mockResolvedValue(mockAdvertisements);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.advertisements[0].title).toBe("Test Ad");
    expect(data.advertisements[0].keyImage).toBe("ad.jpg");
    expect(data.advertisements[0].species).toEqual(["Dog"]);
    expect(mockPrisma.advertisement.findMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        endDate: { gte: expect.any(Date) },
      },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return empty array when no active advertisements exist", async () => {
    // ARRANGE
    mockPrisma.advertisement.findMany.mockResolvedValue([]);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.advertisements).toEqual([]);
    expect(data.count).toBe(0);
  });

  it("should return 500 on database error", async () => {
    // ARRANGE
    const mockError = new Error("Database connection failed");
    mockPrisma.advertisement.findMany.mockRejectedValue(mockError);

    // Spy on console.error to verify it's called
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching all advertisements:",
      mockError
    );

    // Cleanup
    consoleSpy.mockRestore();
  });
});