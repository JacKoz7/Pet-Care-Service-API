import { GET } from "../route";
import { PrismaClient } from "@prisma/client";

// Mock Prisma Client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    spiece: {
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
  spiece: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/species GET", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return species successfully", async () => {
    // ARRANGE
    const mockSpecies = [
      { idSpiece: 1, name: "Dog" },
      { idSpiece: 2, name: "Cat" },
    ];

    mockPrisma.spiece.findMany.mockResolvedValue(mockSpecies);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, species: mockSpecies });
    expect(mockPrisma.spiece.findMany).toHaveBeenCalledWith({
      select: {
        idSpiece: true,
        name: true,
      },
      orderBy: {
        idSpiece: "asc",
      },
    });
  });

  it("should return empty array when no species exist", async () => {
    // ARRANGE
    mockPrisma.spiece.findMany.mockResolvedValue([]);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, species: [] });
  });

  it("should return 500 on database error", async () => {
    // ARRANGE
    const mockError = new Error("Database connection failed");
    mockPrisma.spiece.findMany.mockRejectedValue(mockError);

    // Spy on console.error to verify it's called
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Internal server error" });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching species:",
      mockError
    );

    // Cleanup
    consoleSpy.mockRestore();
  });
});