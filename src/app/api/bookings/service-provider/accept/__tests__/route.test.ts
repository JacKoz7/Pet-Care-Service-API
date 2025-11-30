import { POST } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Firebase Admin
jest.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

import { adminAuth } from "@/lib/firebaseAdmin";

type MockPrismaClient = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  booking: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/booking/accept POST", () => {
  let mockPrisma: MockPrismaClient;
  const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  const createRequest = (body: object, authHeader?: string) => {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers.authorization = authHeader;
    }

    return new NextRequest("http://localhost:3000/api/booking/accept", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  };

  describe("Authorization", () => {
    it("should return 401 if authorization header is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/booking/accept",
        {
          method: "POST",
          body: JSON.stringify({ bookingId: 1 }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if authorization header does not start with Bearer", async () => {
      const request = createRequest({ bookingId: 1 }, "Basic token123");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if token verification fails", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const request = createRequest({ bookingId: 1 }, "Bearer invalid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid or expired token");
    });
  });

  describe("Input Validation", () => {
    it("should return 400 if bookingId is missing", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const request = createRequest({}, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Booking ID is required and must be a number");
    });

    it("should return 400 if bookingId is not a number", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const request = createRequest(
        { bookingId: "not-a-number" },
        "Bearer valid-token"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Booking ID is required and must be a number");
    });

    it("should return 400 if bookingId is null", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const request = createRequest({ bookingId: null }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Booking ID is required and must be a number");
    });
  });

  describe("User Validation", () => {
    it("should return 404 if user not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 403 if user is not an active service provider", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [],
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("User is not an active service provider");
    });
  });

  describe("Booking Validation", () => {
    it("should return 404 if booking not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const request = createRequest({ bookingId: 999 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Booking not found");
    });

    it("should return 403 if service provider is not authorized for this booking", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "PENDING",
        Service_Provider_idService_Provider: 2, // Different service provider
        Service_Provider: { idService_Provider: 2 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized to accept this booking");
    });

    it("should return 400 if booking is not in PENDING status", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "ACCEPTED",
        Service_Provider_idService_Provider: 1,
        Service_Provider: { idService_Provider: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Can only accept pending bookings");
    });

    it("should return 400 if booking is CANCELLED", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "CANCELLED",
        Service_Provider_idService_Provider: 1,
        Service_Provider: { idService_Provider: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Can only accept pending bookings");
    });

    it("should return 400 if booking is COMPLETED", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "COMPLETED",
        Service_Provider_idService_Provider: 1,
        Service_Provider: { idService_Provider: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Can only accept pending bookings");
    });
  });

  describe("Successful Booking Accept", () => {
    it("should accept booking successfully", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "PENDING",
        Service_Provider_idService_Provider: 1,
        Service_Provider: { idService_Provider: 1 },
      });
      mockPrisma.booking.update.mockResolvedValue({
        idBooking: 1,
        status: "ACCEPTED",
      });
      mockPrisma.user.update.mockResolvedValue({});

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Booking accepted successfully");
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { idBooking: 1 },
        data: { status: "ACCEPTED" },
      });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it("should accept booking when user has multiple service providers", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [
          { idService_Provider: 1, isActive: true },
          { idService_Provider: 2, isActive: true },
          { idService_Provider: 3, isActive: true },
        ],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 5,
        status: "PENDING",
        Service_Provider_idService_Provider: 2,
        Service_Provider: { idService_Provider: 2 },
      });
      mockPrisma.booking.update.mockResolvedValue({
        idBooking: 5,
        status: "ACCEPTED",
      });
      mockPrisma.user.update.mockResolvedValue({});

      const request = createRequest({ bookingId: 5 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Booking accepted successfully");
    });

    it("should update user lastActive timestamp", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "PENDING",
        Service_Provider_idService_Provider: 1,
        Service_Provider: { idService_Provider: 1 },
      });
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      await POST(request);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { idUser: 1 },
        data: { lastActive: expect.any(Date) },
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 on internal server error", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should disconnect prisma after successful request", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        idBooking: 1,
        status: "PENDING",
        Service_Provider_idService_Provider: 1,
        Service_Provider: { idService_Provider: 1 },
      });
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it("should disconnect prisma after error", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
