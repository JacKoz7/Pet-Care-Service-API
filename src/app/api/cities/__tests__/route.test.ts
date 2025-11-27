import { GET } from "../route";
import { PrismaClient } from "@prisma/client";

// Mock Prisma Client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    city: {
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
  city: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/cities GET", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return cities successfully", async () => {
    // ARRANGE
    const mockCities = [
      { idCity: 1, name: "Warsaw", imageUrl: "warsaw.jpg" },
      { idCity: 2, name: "Krakow", imageUrl: "krakow.jpg" },
    ];

    mockPrisma.city.findMany.mockResolvedValue(mockCities);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data).toEqual({ cities: mockCities });
    expect(mockPrisma.city.findMany).toHaveBeenCalledWith({
      orderBy: { idCity: "asc" },
    });
  });

  it("should return empty array when no cities exist", async () => {
    // ARRANGE
    mockPrisma.city.findMany.mockResolvedValue([]);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data).toEqual({ cities: [] });
  });

  it("should return 500 on database error", async () => {
    // ARRANGE
    const mockError = new Error("Database connection failed");
    mockPrisma.city.findMany.mockRejectedValue(mockError);

    // Spy on console.error to verify it's called
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch cities" });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching cities:",
      mockError
    );

    // Cleanup
    consoleSpy.mockRestore();
  });

  it("should always disconnect from database", async () => {
    // ARRANGE
    mockPrisma.city.findMany.mockResolvedValue([]);

    // ACT
    await GET();

    // ASSERT
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it("should disconnect from database even when error occurs", async () => {
    // ARRANGE
    mockPrisma.city.findMany.mockRejectedValue(new Error("DB error"));

    // ACT & ASSERT
    await expect(GET()).resolves.toBeDefined();
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it("should order cities by idCity ascending", async () => {
    // ARRANGE
    const mockCities = [
      { idCity: 2, name: "Krakow" },
      { idCity: 1, name: "Warsaw" },
    ];

    mockPrisma.city.findMany.mockResolvedValue(mockCities);

    // ACT
    await GET();

    // ASSERT
    expect(mockPrisma.city.findMany).toHaveBeenCalledWith({
      orderBy: { idCity: "asc" },
    });
  });
});
