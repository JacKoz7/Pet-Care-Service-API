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
      findUnique: jest. fn(),
      update: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    report: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
    findFirst: jest.Mock;
  };
  report: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/report POST", () => {
  let mockPrisma: MockPrismaClient;
  const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
    // Suppress console. error output during tests
    consoleErrorSpy = jest. spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error after each test
    consoleErrorSpy. mockRestore();
  });

  const createRequest = (body: object, authHeader?: string) => {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers. authorization = authHeader;
    }

    return new NextRequest("http://localhost:3000/api/report", {
      method: "POST",
      headers,
      body: JSON. stringify(body),
    });
  };

  describe("Authorization", () => {
    it("should return 401 if authorization header is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/report", {
        method: "POST",
        body: JSON.stringify({ bookingId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status). toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if authorization header does not start with Bearer", async () => {
      const request = createRequest({ bookingId: 1 }, "Basic token123");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data. error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if authorization header is only Bearer with space", async () => {
      const request = createRequest({ bookingId: 1 }, "Bearer ");

      const response = await POST(request);
      const data = await response.json();

      // Empty token after "Bearer " returns the first auth error
      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if token verification fails", async () => {
      mockVerifyIdToken. mockRejectedValue(new Error("Invalid token"));

      const request = createRequest({ bookingId: 1 }, "Bearer invalid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid or expired token");
      expect(consoleErrorSpy). toHaveBeenCalledWith(
        "Token verification failed:",
        expect.any(Error)
      );
    });

    it("should return 401 if token is expired", async () => {
      mockVerifyIdToken. mockRejectedValue(new Error("Token expired"));

      const request = createRequest({ bookingId: 1 }, "Bearer expired-token");

      const response = await POST(request);
      const data = await response. json();

      expect(response.status). toBe(401);
      expect(data.error).toBe("Invalid or expired token");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("User Validation", () => {
    it("should return 404 if user not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user. findUnique.mockResolvedValue(null);

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
      const data = await response. json();

      expect(response.status). toBe(403);
      expect(data.error).toBe("User is not an active service provider");
    });

    it("should return 403 if user only has inactive service providers", async () => {
      mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
      // The query filters for isActive: true, so inactive providers won't be included
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [], // Empty because all are filtered out
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data. error).toBe("User is not an active service provider");
    });
  });

  describe("Input Validation", () => {
    it("should return 400 if bookingId is missing", async () => {
      mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique. mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });

      const request = createRequest({}, "Bearer valid-token");

      const response = await POST(request);
      const data = await response. json();

      expect(response.status). toBe(400);
      expect(data.error).toBe("Booking ID is required");
    });

    it("should return 400 if bookingId is null", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });

      const request = createRequest({ bookingId: null }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Booking ID is required");
    });

    it("should return 400 if bookingId is undefined", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });

      const request = createRequest(
        { bookingId: undefined },
        "Bearer valid-token"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response. status).toBe(400);
      expect(data.error). toBe("Booking ID is required");
    });
  });

  describe("Booking Validation", () => {
    it("should return 404 if booking not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique. mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      const request = createRequest({ bookingId: 999 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe(
        "Booking not found or you don't have permission"
      );
    });

    it("should return 404 if booking belongs to different service provider", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      // findFirst with the filter will return null if no match
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response. json();

      expect(response.status). toBe(404);
      expect(data.error).toBe(
        "Booking not found or you don't have permission"
      );
    });

    it("should return 400 if booking is not OVERDUE", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking. findFirst.mockResolvedValue({
        idBooking: 1,
        status: "PENDING",
        Client_idClient: 1,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Only OVERDUE bookings can be reported");
    });

    it("should return 400 if booking status is ACCEPTED", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 1,
        status: "ACCEPTED",
        Client_idClient: 1,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data. error).toBe("Only OVERDUE bookings can be reported");
    });

    it("should return 400 if booking status is COMPLETED", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 1,
        status: "COMPLETED",
        Client_idClient: 1,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data. error).toBe("Only OVERDUE bookings can be reported");
    });

    it("should return 400 if booking status is CANCELLED", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique. mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma. booking.findFirst. mockResolvedValue({
        idBooking: 1,
        status: "CANCELLED",
        Client_idClient: 1,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 1 },
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response. status).toBe(400);
      expect(data.error). toBe("Only OVERDUE bookings can be reported");
    });
  });

  describe("Duplicate Report Validation", () => {
    it("should return 400 if report already exists for this booking", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking. findFirst.mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 1,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 1 },
      });
      mockPrisma.report.findFirst.mockResolvedValue({
        idReport: 1,
        Booking_idBooking: 1,
      });

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("This booking has already been reported");
    });
  });

  describe("Successful Report Creation", () => {
    it("should create report successfully with message", async () => {
      const mockDate = new Date("2025-01-15T10:00:00Z");
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking. findFirst.mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 2 },
      });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        idReport: 10,
        message: "Client did not pay",
        Booking_idBooking: 1,
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        createdAt: mockDate,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const request = createRequest(
        { bookingId: 1, message: "Client did not pay" },
        "Bearer valid-token"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Report submitted successfully");
      expect(data.report). toEqual({
        id: 10,
        bookingId: 1,
        createdAt: mockDate. toISOString(),
      });
      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          message: "Client did not pay",
          Booking_idBooking: 1,
          Client_idClient: 2,
          Service_Provider_idService_Provider: 1,
        },
      });
    });

    it("should create report successfully without message", async () => {
      const mockDate = new Date("2025-01-15T10:00:00Z");
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma. user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 2 },
      });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create. mockResolvedValue({
        idReport: 10,
        message: null,
        Booking_idBooking: 1,
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        createdAt: mockDate,
      });
      mockPrisma. user.update.mockResolvedValue({});

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response. status).toBe(200);
      expect(data.success). toBe(true);
      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          message: null,
          Booking_idBooking: 1,
          Client_idClient: 2,
          Service_Provider_idService_Provider: 1,
        },
      });
    });

    it("should create report with empty string message as null", async () => {
      const mockDate = new Date("2025-01-15T10:00:00Z");
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma. user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 2 },
      });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create. mockResolvedValue({
        idReport: 10,
        message: null,
        Booking_idBooking: 1,
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        createdAt: mockDate,
      });
      mockPrisma.user.update. mockResolvedValue({});

      const request = createRequest(
        { bookingId: 1, message: "" },
        "Bearer valid-token"
      );

      const response = await POST(request);
      const data = await response. json();

      expect(response.status). toBe(200);
      expect(data.success).toBe(true);
      // Empty string is falsy, so it becomes null
      expect(mockPrisma. report.create).toHaveBeenCalledWith({
        data: {
          message: null,
          Booking_idBooking: 1,
          Client_idClient: 2,
          Service_Provider_idService_Provider: 1,
        },
      });
    });

    it("should update user lastActive timestamp on successful report", async () => {
      const mockDate = new Date("2025-01-15T10:00:00Z");
      mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user. findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 2 },
      });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        idReport: 10,
        message: null,
        Booking_idBooking: 1,
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        createdAt: mockDate,
      });
      mockPrisma.user.update. mockResolvedValue({});

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      await POST(request);

      expect(mockPrisma.user. update).toHaveBeenCalledWith({
        where: { idUser: 1 },
        data: { lastActive: expect.any(Date) },
      });
    });

    it("should create report when user has multiple service providers", async () => {
      const mockDate = new Date("2025-01-15T10:00:00Z");
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
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 5,
        status: "OVERDUE",
        Client_idClient: 10,
        Service_Provider_idService_Provider: 2,
        Client: { idClient: 10 },
      });
      mockPrisma.report. findFirst.mockResolvedValue(null);
      mockPrisma.report. create.mockResolvedValue({
        idReport: 15,
        message: "Payment overdue",
        Booking_idBooking: 5,
        Client_idClient: 10,
        Service_Provider_idService_Provider: 2,
        createdAt: mockDate,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const request = createRequest(
        { bookingId: 5, message: "Payment overdue" },
        "Bearer valid-token"
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response. status).toBe(200);
      expect(data.success). toBe(true);
      expect(data.report. id).toBe(15);
      expect(data.report.bookingId).toBe(5);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 on internal server error during user lookup", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data. error).toBe("Internal server error");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating report:",
        expect.any(Error)
      );
    });

    it("should return 500 on internal server error during booking lookup", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique. mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma. booking.findFirst. mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response. json();

      expect(response.status). toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 on internal server error during report creation", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique. mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma. booking.findFirst. mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 2 },
      });
      mockPrisma. report.findFirst. mockResolvedValue(null);
      mockPrisma.report. create.mockRejectedValue(new Error("Database error"));

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data. error).toBe("Internal server error");
    });

    it("should disconnect prisma after successful request", async () => {
      const mockDate = new Date("2025-01-15T10:00:00Z");
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        ServiceProviders: [{ idService_Provider: 1, isActive: true }],
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        idBooking: 1,
        status: "OVERDUE",
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        Client: { idClient: 2 },
      });
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        idReport: 10,
        message: null,
        Booking_idBooking: 1,
        Client_idClient: 2,
        Service_Provider_idService_Provider: 1,
        createdAt: mockDate,
      });
      mockPrisma.user.update. mockResolvedValue({});

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it("should disconnect prisma after error", async () => {
      mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user. findUnique.mockRejectedValue(new Error("Database error"));

      const request = createRequest({ bookingId: 1 }, "Bearer valid-token");

      await POST(request);

      expect(mockPrisma.$disconnect). toHaveBeenCalled();
    });

    it("should disconnect prisma after authorization failure", async () => {
      const request = new NextRequest("http://localhost:3000/api/report", {
        method: "POST",
        body: JSON.stringify({ bookingId: 1 }),
      });

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});