import { PATCH } from "../route";
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

// Mock Firebase Admin
const mockGetUser = jest.fn();
jest.mock("firebase-admin", () => ({
  auth: () => ({
    getUser: mockGetUser,
  }),
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(() => ({})),
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

describe("/api/user/verify/[firebaseUid] PATCH", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    mockGetUser.mockClear();
    jest.clearAllMocks();
  });

  it("should return 400 if firebaseUid is missing", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/user/verify");
    const context = { params: Promise.resolve({ firebaseUid: "" }) };

    // ACT
    const response = await PATCH(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toBe("Firebase UID is required in URL");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("should return 400 if email is not verified", async () => {
    // ARRANGE
    mockGetUser.mockResolvedValue({ emailVerified: false });

    const request = new NextRequest("http://localhost:3000/api/user/verify/test-uid");
    const context = { params: Promise.resolve({ firebaseUid: "test-uid" }) };

    // ACT
    const response = await PATCH(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toBe("Email not verified");
    expect(mockGetUser).toHaveBeenCalledWith("test-uid");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return 404 if user not found", async () => {
    // ARRANGE
    mockGetUser.mockResolvedValue({ emailVerified: true });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/user/verify/test-uid");
    const context = { params: Promise.resolve({ firebaseUid: "test-uid" }) };

    // ACT
    const response = await PATCH(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
    expect(mockGetUser).toHaveBeenCalledWith("test-uid");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("should verify user successfully if not already verified", async () => {
    // ARRANGE
    const mockFirebaseUser = { emailVerified: true };
    const mockUser = { firebaseUid: "test-uid", isVerified: false };

    mockGetUser.mockResolvedValue(mockFirebaseUser);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, isVerified: true });

    const request = new NextRequest("http://localhost:3000/api/user/verify/test-uid");
    const context = { params: Promise.resolve({ firebaseUid: "test-uid" }) };

    // ACT
    const response = await PATCH(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { firebaseUid: "test-uid" },
      data: {
        isVerified: true,
        verifiedAt: expect.any(Date),
      },
    });
  });

  it("should return success if already verified", async () => {
    // ARRANGE
    const mockFirebaseUser = { emailVerified: true };
    const mockUser = { firebaseUid: "test-uid", isVerified: true };

    mockGetUser.mockResolvedValue(mockFirebaseUser);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const request = new NextRequest("http://localhost:3000/api/user/verify/test-uid");
    const context = { params: Promise.resolve({ firebaseUid: "test-uid" }) };

    // ACT
    const response = await PATCH(request, context);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});