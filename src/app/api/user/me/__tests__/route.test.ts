import { GET, PUT } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    city: {
      findUnique: jest.fn(),
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
  city: {
    findUnique: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/user/attributes", () => {
  let mockPrisma: MockPrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockAdminAuth = require("@/lib/firebaseAdmin").adminAuth;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if authorization header is missing or invalid", async () => {
      // ARRANGE
      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        headers: { authorization: "Invalid" },
      });

      // ACT
      const response = await GET(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 400 if user profile not found", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        headers: { authorization: "Bearer valid-token" },
      });

      // ACT
      const response = await GET(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(400);
      expect(data.error).toBe("User profile not found. Please complete registration.");
    });

    it("should return 403 if email not verified", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "test-uid",
        isVerified: false,
        City: { idCity: 1, name: "Warsaw", imageUrl: "warsaw.jpg" },
        ServiceProviders: [],
        lastActive: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        headers: { authorization: "Bearer valid-token" },
      });

      // ACT
      const response = await GET(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(403);
      expect(data.error).toBe("Email not verified. Please verify your email to access your account.");
    });

    it("should return user profile successfully", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "test-uid",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "123456789",
        profilePictureUrl: "profile.jpg",
        isVerified: true,
        City: { idCity: 1, name: "Warsaw", imageUrl: "warsaw.jpg" },
        ServiceProviders: [{ idService_Provider: 1 }],
        lastActive: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        headers: { authorization: "Bearer valid-token" },
      });

      // ACT
      const response = await GET(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.firstName).toBe("John");
      expect(data.user.city.name).toBe("Warsaw");
      expect(data.user.isServiceProvider).toBe(true);
      expect(data.user.serviceProviderId).toBe(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { idUser: 1 },
        data: { lastActive: expect.any(Date) },
      });
    });
  });

  describe("PUT", () => {
    it("should return 401 if authorization header is missing or invalid", async () => {
      // ARRANGE
      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        method: "PUT",
        headers: { authorization: "Invalid" },
        body: JSON.stringify({}),
      });

      // ACT
      const response = await PUT(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 403 if email not verified", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "test-uid",
        isVerified: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        method: "PUT",
        headers: { authorization: "Bearer valid-token" },
        body: JSON.stringify({ firstName: "Jane" }),
      });

      // ACT
      const response = await PUT(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(403);
      expect(data.error).toBe("Email not verified. Please verify your email to update your profile.");
    });

    it("should return 400 if phone number is invalid", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "test-uid",
        isVerified: true,
        City_idCity: 1,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        method: "PUT",
        headers: { authorization: "Bearer valid-token" },
        body: JSON.stringify({ phoneNumber: "123" }), // invalid length
      });

      // ACT
      const response = await PUT(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(400);
      expect(data.error).toBe("Phone number must be exactly 9 digits");
    });

    it("should return 400 if city ID is invalid", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "test-uid",
        isVerified: true,
        City_idCity: 1,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.city.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        method: "PUT",
        headers: { authorization: "Bearer valid-token" },
        body: JSON.stringify({ cityId: 999 }),
      });

      // ACT
      const response = await PUT(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid city ID");
    });

    it("should update user profile successfully", async () => {
      // ARRANGE
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "test-uid" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "test-uid",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "123456789",
        profilePictureUrl: "profile.jpg",
        isVerified: true,
        City_idCity: 1,
        City: { idCity: 1, name: "Warsaw", imageUrl: "warsaw.jpg" },
        ServiceProviders: [{ idService_Provider: 1 }],
        lastActive: new Date(),
      };

      const mockUpdatedUser = {
        ...mockUser,
        firstName: "Jane",
        phoneNumber: "987654321",
        City_idCity: 2,
        City: { idCity: 2, name: "Krakow", imageUrl: "krakow.jpg" },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.city.findUnique.mockResolvedValue({ idCity: 2, name: "Krakow", imageUrl: "krakow.jpg" });
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const request = new NextRequest("http://localhost:3000/api/user/attributes", {
        method: "PUT",
        headers: { authorization: "Bearer valid-token" },
        body: JSON.stringify({
          firstName: "Jane",
          phoneNumber: "987654321",
          cityId: 2,
        }),
      });

      // ACT
      const response = await PUT(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.firstName).toBe("Jane");
      expect(data.user.phoneNumber).toBe("987654321");
      expect(data.user.city.name).toBe("Krakow");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { idUser: 1 },
        data: {
          firstName: "Jane",
          lastName: "Doe",
          phoneNumber: "987654321",
          City_idCity: 2,
        },
        include: expect.any(Object),
      });
    });
  });
});