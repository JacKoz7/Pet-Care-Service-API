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
    savedAdvertisement: {
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
    update: jest.Mock;
  };
  savedAdvertisement: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/client/saved-ads GET", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/client/saved-ads", {
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

  it("should return 404 if user not found", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/client/saved-ads", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: "test-uid" },
      include: { Clients: true },
    });
  });

  it("should return empty advertisements if no clients", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/client/saved-ads", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.advertisements).toEqual([]);
    expect(mockPrisma.savedAdvertisement.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("should return empty advertisements if no saved ads", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [{ idClient: 1 }],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.savedAdvertisement.findMany.mockResolvedValue([]);
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/client/saved-ads", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.advertisements).toEqual([]);
    expect(mockPrisma.savedAdvertisement.findMany).toHaveBeenCalledWith({
      where: { Client_idClient: 1 },
      include: expect.any(Object),
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { idUser: 1 },
      data: { lastActive: expect.any(Date) },
    });
  });

  it("should fetch saved advertisements successfully", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      idUser: 1,
      firebaseUid: "test-uid",
      Clients: [{ idClient: 1 }],
    };

    const mockSavedAd = {
      Advertisement: {
        idAdvertisement: 1,
        title: "Test Ad",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        serviceStartTime: new Date("1970-01-01T10:00:00"),
        serviceEndTime: new Date("1970-01-01T12:00:00"),
        status: "ACTIVE",
        Images: [{ imageUrl: "ad.jpg" }],
        AdvertisementSpieces: [{ spiece: { name: "Dog" } }],
        Service_Provider: {
          User: {
            City: { idCity: 1, name: "Warsaw", imageUrl: "warsaw.jpg" },
          },
        },
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.savedAdvertisement.findMany.mockResolvedValue([mockSavedAd]);
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/client/saved-ads", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.advertisements[0].title).toBe("Test Ad");
    expect(data.advertisements[0].keyImage).toBe("ad.jpg");
    expect(data.advertisements[0].species).toEqual(["Dog"]);
    expect(data.advertisements[0].city.name).toBe("Warsaw");
  });
});