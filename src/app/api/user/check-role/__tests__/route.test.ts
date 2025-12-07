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
  $disconnect: jest.Mock;
};

describe("/api/user/roles GET", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/user/roles", {
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

  it("should return 401 if token verification fails", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:3000/api/user/roles", {
      headers: { authorization: "Bearer invalid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token");
    expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith("invalid-token");
    expect(consoleSpy).toHaveBeenCalledWith("Token verification failed:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("should return 404 if user not found", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/user/roles", {
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
      include: expect.any(Object),
    });
  });

  it("should return 403 if email not verified", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      firebaseUid: "test-uid",
      isVerified: false,
      ServiceProviders: [],
      Clients: [],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/user/roles", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(403);
    expect(data.error).toBe("Email not verified. Please verify your email to access your account.");
  });

  it("should return roles for client only", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      firebaseUid: "test-uid",
      isVerified: true,
      ServiceProviders: [{ idService_Provider: 1, isActive: false }],
      Clients: [{ idClient: 1 }],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/user/roles", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.roles).toEqual(["client"]);
    expect(data.serviceProviderIds).toEqual([1]);
    expect(data.clientIds).toEqual([1]);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { firebaseUid: "test-uid" },
      data: { lastActive: expect.any(Date) },
    });
  });

  it("should return roles including service_provider if active", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      firebaseUid: "test-uid",
      isVerified: true,
      ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      Clients: [{ idClient: 1 }],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/user/roles", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.roles).toEqual(["client", "service_provider"]);
    expect(data.serviceProviderIds).toEqual([1]);
    expect(data.clientIds).toEqual([1]);
  });
});