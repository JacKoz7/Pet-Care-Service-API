import { POST } from "../route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    city: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    client: {
      create: jest.fn(),
    },
    admin: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Define a type for the mocked Prisma client
type MockPrismaClient = {
  city: {
    findUnique: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  client: {
    create: jest.Mock;
  };
  admin: {
    create: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe("/api/user/attributes POST", () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;
    jest.clearAllMocks();
  });

  it("should return 400 if required fields are missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/user/attributes",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Firebase UID, email, and cityId are required");
  });

  it("should return 400 if phone number is invalid", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/user/attributes",
      {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: "test123",
          email: "test@test.com",
          cityId: 1,
          phoneNumber: "12345", // invalid - not 9 digits
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Phone number must be exactly 9 digits");
  });

  it("should return 400 if city does not exist", async () => {
    mockPrisma.city.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/user/attributes",
      {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: "test123",
          email: "test@test.com",
          cityId: 999,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid city ID");
  });

  it("should return 409 if user already exists", async () => {
    mockPrisma.city.findUnique.mockResolvedValue({ idCity: 1, name: "Warsaw" });
    mockPrisma.user.findFirst.mockResolvedValue({
      idUser: 1,
      email: "test@test.com", 
      firebaseUid: "test123",
      phoneNumber: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/user/attributes",
      {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: "test123",
          email: "test@test.com",
          cityId: 1,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Email already in use"); 
  });

  it("should create user successfully", async () => {
    const mockCity = { idCity: 1, name: "Warsaw" };
    const mockUser = {
      idUser: 1,
      firebaseUid: "test123",
      firstName: "John",
      lastName: "Doe",
      email: "test@test.com",
      phoneNumber: "123456789",
      City: mockCity,
      isVerified: false,
    };

    mockPrisma.city.findUnique.mockResolvedValue(mockCity);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    mockPrisma.client.create.mockResolvedValue({});

    const request = new NextRequest(
      "http://localhost:3000/api/user/attributes",
      {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: "test123",
          email: "test@test.com",
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "123456789",
          cityId: 1,
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("test@test.com");
    expect(mockPrisma.client.create).toHaveBeenCalled();
  });
});
