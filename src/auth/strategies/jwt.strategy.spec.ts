import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthRepository } from "../repositories/auth.repository";
import { type AuthenticatedRegularUser, type JwtPayload } from "../types/auth.types";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockAuthRepository = {
    getGuestSession: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue("test-jwt-secret"),
    get: jest.fn().mockReturnValue("test"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);

    jest.clearAllMocks();
  });

  describe("validate", () => {
    describe("일반 사용자 검증", () => {
      const userPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        role: "user",
      };

      it("유효한 사용자를 검증하고 AuthenticatedUser를 반환해야 한다", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          profileImage: "https://example.com/profile.jpg",
        };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await strategy.validate(userPayload);

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: "user-123" },
        });
        expect(result).toEqual({
          id: "user-123",
          email: "test@example.com",
          role: "user",
          name: "Test User",
          profileImage: "https://example.com/profile.jpg",
        });
      });

      it("프로필 이미지가 없으면 null을 반환해야 한다", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          profileImage: null,
        };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await strategy.validate(userPayload);

        expect((result as AuthenticatedRegularUser).profileImage).toBeNull();
      });

      it("사용자가 존재하지 않으면 UnauthorizedException을 던져야 한다", async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        await expect(strategy.validate(userPayload)).rejects.toThrow(
          new UnauthorizedException("User not found"),
        );
      });
    });

    describe("게스트 사용자 검증", () => {
      const guestPayload: JwtPayload = {
        sub: "guest-123",
        email: null,
        role: "guest",
      };

      it("유효한 게스트 세션을 검증하고 AuthenticatedUser를 반환해야 한다", async () => {
        const mockGuestData = {
          usageCount: 5,
          maxUsage: 10,
        };
        mockAuthRepository.getGuestSession.mockResolvedValue(mockGuestData);

        const result = await strategy.validate(guestPayload);

        expect(mockAuthRepository.getGuestSession).toHaveBeenCalledWith("guest-123");
        expect(result).toEqual({
          id: "guest-123",
          email: null,
          role: "guest",
          usageCount: 5,
          maxUsage: 10,
        });
      });

      it("게스트 세션이 만료되었으면 UnauthorizedException을 던져야 한다", async () => {
        mockAuthRepository.getGuestSession.mockResolvedValue(null);

        await expect(strategy.validate(guestPayload)).rejects.toThrow(
          new UnauthorizedException("Guest session expired or not found"),
        );
      });
    });
  });
});
