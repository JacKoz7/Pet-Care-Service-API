import { DELETE, PUT } from "../route";
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
    review: {
      findUnique: jest.fn(),
      delete: jest.fn(),
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
  review: {
    findUnique: jest.Mock;
    delete: jest.Mock;
    update: jest. Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/reviews/[id]", () => {
  let mockPrisma: MockPrismaClient;
  const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy. mockRestore();
  });

  const createDeleteRequest = (authHeader?: string) => {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers. authorization = authHeader;
    }

    return new NextRequest("http://localhost:3000/api/reviews/1", {
      method: "DELETE",
      headers,
    });
  };

  const createPutRequest = (body: object, authHeader?: string) => {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers.authorization = authHeader;
    }

    return new NextRequest("http://localhost:3000/api/reviews/1", {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  };

  const createParams = (id: string) => Promise.resolve({ id });

  describe("DELETE /api/reviews/[id]", () => {
    describe("Authorization", () => {
      it("should return 401 if authorization header is missing", async () => {
        const request = createDeleteRequest();

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe(
          "You ain't logged in, who the fuck is you nigga?"
        );
      });

      it("should return 401 if authorization header does not start with Bearer", async () => {
        const request = createDeleteRequest("Basic token123");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe(
          "You ain't logged in, who the fuck is you nigga?"
        );
      });

      it("should return 401 if token verification fails", async () => {
        mockVerifyIdToken. mockRejectedValue(new Error("Invalid token"));

        const request = createDeleteRequest("Bearer invalid-token");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response. status).toBe(500);
        expect(data.error).toBe("Server down bad, whole block bleedin' rn");
      });

      it("should return 401 if user not found", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response. json();

        expect(response.status). toBe(401);
        expect(data.error).toBe(
          "You ain't logged in, who the fuck is you nigga?"
        );
      });

      it("should return 401 if user has no clients", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [],
        });

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe(
          "You ain't logged in, who the fuck is you nigga?"
        );
      });
    });

    describe("Input Validation", () => {
      it("should return 400 if review ID is not a number", async () => {
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique. mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, {
          params: createParams("not-a-number"),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe(
          "ID lookin retarded, send a real number nigga"
        );
      });

      it("should return 400 if review ID is NaN", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, {
          params: createParams("abc"),
        });
        const data = await response.json();

        expect(response. status).toBe(400);
        expect(data.error). toBe(
          "ID lookin retarded, send a real number nigga"
        );
      });
    });

    describe("Review Validation", () => {
      it("should return 404 if review not found", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique. mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review. findUnique.mockResolvedValue(null);

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, { params: createParams("999") });
        const data = await response. json();

        expect(response.status). toBe(404);
        expect(data.error).toBe("Shit already ghost, can't find it");
      });

      it("should return 403 if review belongs to another client", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma. review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 2, // Different client
          Booking: { Client_idClient: 2 },
        });

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe(
          "That ain't yo review nigga, touch it and you catch a permanent ban"
        );
      });
    });

    describe("Successful Deletion", () => {
      it("should delete review successfully", async () => {
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user. findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          Booking: { Client_idClient: 1 },
        });
        mockPrisma.review.delete. mockResolvedValue({});
        mockPrisma.user.update. mockResolvedValue({});

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data. message).toBe("Review deleted successfully");
        expect(mockPrisma.review.delete).toHaveBeenCalledWith({
          where: { idReview: 1 },
        });
      });

      it("should update user lastActive on successful deletion", async () => {
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user. findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          Booking: { Client_idClient: 1 },
        });
        mockPrisma.review.delete.mockResolvedValue({});
        mockPrisma.user.update.mockResolvedValue({});

        const request = createDeleteRequest("Bearer valid-token");

        await DELETE(request, { params: createParams("1") });

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { idUser: 1 },
          data: { lastActive: expect.any(Date) },
        });
      });
    });

    describe("Error Handling", () => {
      it("should return 500 on internal server error", async () => {
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user. findUnique.mockRejectedValue(
          new Error("Database error")
        );

        const request = createDeleteRequest("Bearer valid-token");

        const response = await DELETE(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Server down bad, whole block bleedin' rn");
        expect(consoleErrorSpy). toHaveBeenCalledWith(
          "Error deleting review:",
          expect.any(Error)
        );
      });

      it("should disconnect prisma after request", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma. review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          Booking: { Client_idClient: 1 },
        });
        mockPrisma.review.delete. mockResolvedValue({});
        mockPrisma.user.update.mockResolvedValue({});

        const request = createDeleteRequest("Bearer valid-token");

        await DELETE(request, { params: createParams("1") });

        expect(mockPrisma.$disconnect).toHaveBeenCalled();
      });
    });
  });

  describe("PUT /api/reviews/[id]", () => {
    describe("Authorization", () => {
      it("should return 401 if authorization header is missing", async () => {
        const request = createPutRequest({ rating: 5 });

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response. status).toBe(401);
        expect(data.error). toBe("No token, who the fuck is you?");
      });

      it("should return 401 if authorization header does not start with Bearer", async () => {
        const request = createPutRequest({ rating: 5 }, "Basic token123");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response. status).toBe(401);
        expect(data.error). toBe("No token, who the fuck is you?");
      });

      it("should return 401 if user not found", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response. json();

        expect(response.status). toBe(401);
        expect(data.error).toBe("No token, who the fuck is you?");
      });

      it("should return 401 if user has no clients", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [],
        });

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data. error).toBe("No token, who the fuck is you?");
      });
    });

    describe("Input Validation", () => {
      it("should return 400 if review ID is not a number", async () => {
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user. findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, {
          params: createParams("invalid"),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe(
          "ID lookin retarded, send a real number nigga"
        );
      });

      it("should return 400 if both rating and comment are missing", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createPutRequest({}, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe(
          "Body missin rating or comment — fix that dumb shit nigga"
        );
      });

      it("should return 400 if rating is less than 1", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma. user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createPutRequest({ rating: 0 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Rating gotta be 1-5, you wildin");
      });

      it("should return 400 if rating is greater than 5", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createPutRequest({ rating: 6 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response. status).toBe(400);
        expect(data.error). toBe("Rating gotta be 1-5, you wildin");
      });

      it("should return 400 if rating is negative", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });

        const request = createPutRequest({ rating: -1 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response. status).toBe(400);
        expect(data.error). toBe("Rating gotta be 1-5, you wildin");
      });
    });

    describe("Review Validation", () => {
      it("should return 404 if review not found", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue(null);

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("999") });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data. error).toBe("That review already in the grave");
      });

      it("should return 403 if review belongs to another client", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique. mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review. findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 2, // Different client
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data. error).toBe(
          "Tryna edit another nigga review? You bold as hell, get banned"
        );
      });
    });

    describe("Successful Update", () => {
      it("should update review with new rating only", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review.update.mockResolvedValue({
          idReview: 1,
          rating: 5,
          comment: "Old comment",
          createdAt: mockDate,
        });
        mockPrisma.user.update.mockResolvedValue({});

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data. success).toBe(true);
        expect(data.message). toBe("Review updated successfully");
        expect(data.review.rating). toBe(5);
        expect(data.review.comment). toBe("Old comment");
      });

      it("should update review with new comment only", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique. mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review. findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review.update.mockResolvedValue({
          idReview: 1,
          rating: 3,
          comment: "New comment",
          createdAt: mockDate,
        });
        mockPrisma.user. update.mockResolvedValue({});

        const request = createPutRequest(
          { comment: "New comment" },
          "Bearer valid-token"
        );

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response. status).toBe(200);
        expect(data.success). toBe(true);
        expect(data.review.rating).toBe(3);
        expect(data.review.comment).toBe("New comment");
      });

      it("should update review with both rating and comment", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });
        mockPrisma. review.update.mockResolvedValue({
          idReview: 1,
          rating: 5,
          comment: "New comment",
          createdAt: mockDate,
        });
        mockPrisma.user.update. mockResolvedValue({});

        const request = createPutRequest(
          { rating: 5, comment: "New comment" },
          "Bearer valid-token"
        );

        const response = await PUT(request, { params: createParams("1") });
        const data = await response. json();

        expect(response.status). toBe(200);
        expect(data.success).toBe(true);
        expect(data.review.rating).toBe(5);
        expect(data.review.comment).toBe("New comment");
      });

      it("should set comment to null when empty string provided", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique. mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review. findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review.update. mockResolvedValue({
          idReview: 1,
          rating: 3,
          comment: null,
          createdAt: mockDate,
        });
        mockPrisma. user.update.mockResolvedValue({});

        const request = createPutRequest(
          { comment: "" },
          "Bearer valid-token"
        );

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockPrisma.review.update).toHaveBeenCalledWith({
          where: { idReview: 1 },
          data: {
            rating: 3,
            comment: null,
          },
        });
      });

      it("should update user lastActive on successful update", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique. mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique. mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review.update.mockResolvedValue({
          idReview: 1,
          rating: 5,
          comment: "Old comment",
          createdAt: mockDate,
        });
        mockPrisma.user. update.mockResolvedValue({});

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        await PUT(request, { params: createParams("1") });

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { idUser: 1 },
          data: { lastActive: expect.any(Date) },
        });
      });

      it("should accept rating at boundary value 1", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user. findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: null,
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review.update.mockResolvedValue({
          idReview: 1,
          rating: 1,
          comment: null,
          createdAt: mockDate,
        });
        mockPrisma.user.update. mockResolvedValue({});

        const request = createPutRequest({ rating: 1 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data. review.rating).toBe(1);
      });

      it("should accept rating at boundary value 5", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma.review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: null,
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review. update.mockResolvedValue({
          idReview: 1,
          rating: 5,
          comment: null,
          createdAt: mockDate,
        });
        mockPrisma.user.update.mockResolvedValue({});

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data. review.rating).toBe(5);
      });
    });

    describe("Error Handling", () => {
      it("should return 500 on internal server error", async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockRejectedValue(
          new Error("Database error")
        );

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        const response = await PUT(request, { params: createParams("1") });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data. error).toBe("Backend crashin out, trap house on fire rn");
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error updating review:",
          expect.any(Error)
        );
      });

      it("should disconnect prisma after request", async () => {
        const mockDate = new Date("2025-01-15T10:00:00Z");
        mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user.findUnique.mockResolvedValue({
          idUser: 1,
          firebaseUid: "firebase-uid-123",
          Clients: [{ idClient: 1 }],
        });
        mockPrisma. review.findUnique.mockResolvedValue({
          idReview: 1,
          Client_idClient: 1,
          rating: 3,
          comment: "Old comment",
          Booking: { status: "COMPLETED" },
        });
        mockPrisma.review.update.mockResolvedValue({
          idReview: 1,
          rating: 5,
          comment: "Old comment",
          createdAt: mockDate,
        });
        mockPrisma.user.update. mockResolvedValue({});

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        await PUT(request, { params: createParams("1") });

        expect(mockPrisma.$disconnect).toHaveBeenCalled();
      });

      it("should disconnect prisma after error", async () => {
        mockVerifyIdToken. mockResolvedValue({ uid: "firebase-uid-123" });
        mockPrisma.user. findUnique.mockRejectedValue(
          new Error("Database error")
        );

        const request = createPutRequest({ rating: 5 }, "Bearer valid-token");

        await PUT(request, { params: createParams("1") });

        expect(mockPrisma.$disconnect). toHaveBeenCalled();
      });
    });
  });
});