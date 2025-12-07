import { GET } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    symptom: {
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
  symptom: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/client/symptoms GET", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    // ARRANGE
    const request = new NextRequest("http://localhost:3000/api/client/symptoms", {
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

  it("should return 403 if user is not a client", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    mockPrisma.user.findUnique.mockResolvedValue({
      firebaseUid: "test-uid",
      Clients: [],
    });

    const request = new NextRequest("http://localhost:3000/api/client/symptoms", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(403);
    expect(data.error).toBe("User is not a client");
  });

  it("should return symptoms successfully", async () => {
    // ARRANGE
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

    const mockUser = {
      firebaseUid: "test-uid",
      Clients: [{ idClient: 1 }],
    };

    const mockSymptoms = [
      { idSymptom: 1, name: "Fever" },
      { idSymptom: 2, name: "Cough" },
    ];

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.symptom.findMany.mockResolvedValue(mockSymptoms);

    const request = new NextRequest("http://localhost:3000/api/client/symptoms", {
      headers: { authorization: "Bearer valid-token" },
    });

    // ACT
    const response = await GET(request);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.symptoms).toEqual(mockSymptoms);
    expect(mockPrisma.symptom.findMany).toHaveBeenCalledWith({
      orderBy: { idSymptom: "asc" },
    });
  });
});