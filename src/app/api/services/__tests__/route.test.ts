import { GET } from "../route";
import { PrismaClient } from "@prisma/client";

// Mock Prisma Client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    service: {
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
  service: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/services GET", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return services successfully", async () => {
    // ARRANGE
    const mockServices = [
      { idService: 1, name: "Consultation" },
      { idService: 2, name: "Installation" },
    ];

    mockPrisma.service.findMany.mockResolvedValue(mockServices);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, services: mockServices });
    expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
      select: {
        idService: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  });

  it("should return empty array when no services exist", async () => {
    // ARRANGE
    mockPrisma.service.findMany.mockResolvedValue([]);

    // ACT
    const response = await GET();
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, services: [] });
  });

  it("should return 500 on database error", async () => {
    // ARRANGE
    const mockError = new Error("Database connection failed");
    mockPrisma.service.findMany.mockRejectedValue(mockError);

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
      "Error fetching services:",
      mockError
    );

    // Cleanup
    consoleSpy.mockRestore();
  });
});