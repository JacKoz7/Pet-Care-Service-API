import { GET, POST } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Firebase Admin
jest.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

// Mock Firebase Storage
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: jest.fn(),
        getSignedUrl: jest
          .fn()
          .mockResolvedValue(["https://storage.example.com/signed-url"]),
      })),
    })),
  })),
}));

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pet: {
      create: jest.fn(),
    },
    spiece: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  // Mock Prisma error class
  const PrismaClientKnownRequestError = class extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
    }
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      PrismaClientKnownRequestError,
    },
  };
});

import { adminAuth } from "@/lib/firebaseAdmin";

type MockPrismaClient = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  pet: {
    create: jest.Mock;
  };
  spiece: {
    findUnique: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/user/pets", () => {
  let mockPrisma: MockPrismaClient;
  const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test-bucket";
  });

  describe("GET", () => {
    it("should return 401 if authorization header is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if authorization header is invalid format", async () => {
      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "GET",
        headers: {
          authorization: "InvalidFormat token123",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if token verification fails", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "GET",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid or expired token");
    });

    it("should return 404 if user not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "GET",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return pets successfully", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [
          {
            idClient: 1,
            Pets: [
              {
                idPet: 1,
                name: "Buddy",
                age: 3,
                description: "Friendly dog",
                isHealthy: true,
                customSpeciesName: null,
                Spiece: { name: "Dog" },
                Images: [
                  { imageUrl: "https://example.com/image1.jpg", order: 1 },
                ],
              },
              {
                idPet: 2,
                name: "Whiskers",
                age: 2,
                description: "Cute cat",
                isHealthy: true,
                customSpeciesName: "Persian Cat",
                Spiece: { name: "Inne" },
                Images: [],
              },
            ],
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "GET",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pets).toHaveLength(2);
      expect(data.pets[0]).toEqual({
        id: 1,
        name: "Buddy",
        age: 3,
        description: "Friendly dog",
        keyImage: "https://example.com/image1.jpg",
        species: "Dog",
        isHealthy: true,
      });
      expect(data.pets[1]).toEqual({
        id: 2,
        name: "Whiskers",
        age: 2,
        description: "Cute cat",
        keyImage: null,
        species: "Persian Cat",
        isHealthy: true,
      });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it("should return empty pets array if user has no pets", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const mockUser = {
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [
          {
            idClient: 1,
            Pets: [],
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "GET",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pets).toHaveLength(0);
    });
  });

  describe("POST", () => {
    const createFormDataRequest = (
      formDataEntries: Record<string, string | File | File[]>
    ) => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(formDataEntries)) {
        if (Array.isArray(value)) {
          value.forEach((file) => formData.append(key, file));
        } else {
          formData.append(key, value);
        }
      }

      return new NextRequest("http://localhost:3000/api/user/pets", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
        },
        body: formData,
      });
    };

    const createMockFile = (
      name: string,
      type: string = "image/jpeg"
    ): File => {
      const blob = new Blob(["test content"], { type });
      return new File([blob], name, { type });
    };

    it("should return 401 if authorization header is missing", async () => {
      const formData = new FormData();
      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authorization header missing or invalid");
    });

    it("should return 401 if token verification fails", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        speciesName: "Dog",
        images: createMockFile("test.jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid or expired token");
    });

    it("should return 400 if required fields are missing", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const formData = new FormData();
      formData.append("name", "Buddy");
      // Missing age, speciesName, and images

      const request = new NextRequest("http://localhost:3000/api/user/pets", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
        },
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields or no images provided");
    });

    it("should return 400 if age is invalid (negative)", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const request = createFormDataRequest({
        name: "Buddy",
        age: "-1",
        speciesName: "Dog",
        images: createMockFile("test.jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Age must be a non-negative integer up to 999");
    });

    it("should return 400 if age is too large", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const request = createFormDataRequest({
        name: "Buddy",
        age: "1000",
        speciesName: "Dog",
        images: createMockFile("test.jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Age must be a non-negative integer up to 999");
    });

    it("should return 400 if age is not a number", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      const request = createFormDataRequest({
        name: "Buddy",
        age: "not-a-number",
        speciesName: "Dog",
        images: createMockFile("test. jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Age must be a non-negative integer up to 999");
    });

    it("should return 404 if user not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        speciesName: "Dog",
        images: createMockFile("test. jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User or client not found");
    });

    it("should return 404 if user has no clients", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });
      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [],
      });

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        speciesName: "Dog",
        images: createMockFile("test. jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User or client not found");
    });

    it("should create pet successfully with existing species", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [{ idClient: 1 }],
      });

      mockPrisma.spiece.findUnique.mockResolvedValue({
        idSpiece: 1,
        name: "Dog",
      });

      const mockCreatedPet = {
        idPet: 1,
        name: "Buddy",
        age: 3,
        description: "Friendly dog",
        isHealthy: null,
        customSpeciesName: null,
        Spiece: { name: "Dog" },
        Images: [
          { imageUrl: "https://storage.example.com/signed-url", order: 1 },
        ],
      };

      mockPrisma.pet.create.mockResolvedValue(mockCreatedPet);

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        description: "Friendly dog",
        speciesName: "Dog",
        images: createMockFile("test.jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pet).toEqual({
        id: 1,
        name: "Buddy",
        age: 3,
        description: "Friendly dog",
        keyImage: "https://storage.example.com/signed-url",
        species: "Dog",
        isHealthy: null,
      });
    });

    it("should create pet with custom species when species not found", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [{ idClient: 1 }],
      });

      // First call for custom species returns null, second call for "Inne" returns the special species
      mockPrisma.spiece.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ idSpiece: 99, name: "Inne" });

      const mockCreatedPet = {
        idPet: 1,
        name: "Fluffy",
        age: 2,
        description: null,
        isHealthy: null,
        customSpeciesName: "Exotic Bird",
        Spiece: { name: "Inne" },
        Images: [
          { imageUrl: "https://storage.example.com/signed-url", order: 1 },
        ],
      };

      mockPrisma.pet.create.mockResolvedValue(mockCreatedPet);

      const request = createFormDataRequest({
        name: "Fluffy",
        age: "2",
        speciesName: "Exotic Bird",
        images: createMockFile("test.jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pet.species).toBe("Exotic Bird");
    });

    it("should return 500 if storage bucket is not configured", async () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [{ idClient: 1 }],
      });

      mockPrisma.spiece.findUnique.mockResolvedValue({
        idSpiece: 1,
        name: "Dog",
      });

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        speciesName: "Dog",
        images: createMockFile("test.jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Storage bucket not configured");
    });

    it("should return 409 if pet with same name already exists", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [{ idClient: 1 }],
      });

      mockPrisma.spiece.findUnique.mockResolvedValue({
        idSpiece: 1,
        name: "Dog",
      });

      // Import Prisma to create the error
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Prisma } = require("@prisma/client");
      mockPrisma.pet.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
        })
      );

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        speciesName: "Dog",
        images: createMockFile("test. jpg"),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe(
        "A pet with this name already exists for your account"
      );
    });

    it("should create pet with multiple images", async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: "firebase-uid-123" });

      mockPrisma.user.findUnique.mockResolvedValue({
        idUser: 1,
        firebaseUid: "firebase-uid-123",
        Clients: [{ idClient: 1 }],
      });

      mockPrisma.spiece.findUnique.mockResolvedValue({
        idSpiece: 1,
        name: "Dog",
      });

      const mockCreatedPet = {
        idPet: 1,
        name: "Buddy",
        age: 3,
        description: null,
        isHealthy: null,
        customSpeciesName: null,
        Spiece: { name: "Dog" },
        Images: [
          { imageUrl: "https://storage.example.com/signed-url", order: 1 },
          { imageUrl: "https://storage.example.com/signed-url-2", order: 2 },
        ],
      };

      mockPrisma.pet.create.mockResolvedValue(mockCreatedPet);

      const request = createFormDataRequest({
        name: "Buddy",
        age: "3",
        speciesName: "Dog",
        images: [createMockFile("test1.jpg"), createMockFile("test2.jpg")],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pet.keyImage).toBe("https://storage.example.com/signed-url");
    });
  });
});
