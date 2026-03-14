import { createHash } from "crypto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";

import { AuthService } from "./auth.service";
import { GUEST_CONFIG } from "./constants";
import { AuthRepository } from "./repositories/auth.repository";
import { type AuthenticatedRegularUser } from "./types/auth.types";

describe("AuthService", () => {
  let service: AuthService;

  const mockUser: AuthenticatedRegularUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    profileImage: "image.jpg",
    role: "user",
  };

  const mockAuthRepository = {
    findUserByGoogleId: jest.fn(),
    createUser: jest.fn(),
    setRefreshToken: jest.fn(),
    getRefreshToken: jest.fn(),
    findUserById: jest.fn(),
    deleteRefreshToken: jest.fn(),
    saveAuthCode: jest.fn(),
    getAuthCode: jest.fn(),
    deleteAuthCode: jest.fn(),
    incrementIpCountAtomic: jest.fn(),
    createGuestSession: jest.fn(),
    incrementGuestUsageAtomic: jest.fn(),
    getGuestSession: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      switch (key) {
        case "JWT_SECRET":
          return "test-secret";
        case "JWT_REFRESH_SECRET":
          return "test-refresh-secret";
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("서비스가 정의되어 있어야 합니다", () => {
    expect(service).toBeDefined();
  });

  describe("Google Login", () => {
    const profile = {
      id: "google-123",
      email: "test@example.com",
      name: "Test User",
      picture: "image.jpg",
    };

    it("이미 존재하는 유저라면 해당 유저를 반환해야 합니다", async () => {
      mockAuthRepository.findUserByGoogleId.mockResolvedValue(mockUser);

      const result = await service.validateGoogleUser(profile);

      expect(result).toEqual(mockUser);
      expect(mockAuthRepository.findUserByGoogleId).toHaveBeenCalledWith(profile.id);
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
    });

    it("존재하지 않는 유저라면 새로 생성하여 반환해야 합니다", async () => {
      mockAuthRepository.findUserByGoogleId.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      const result = await service.validateGoogleUser(profile);

      expect(result).toEqual(mockUser);
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        profileImage: profile.picture,
      });
    });
  });

  describe("Refresh Token", () => {
    const refreshToken = "valid-refresh-token";
    const payload = { sub: "user-123", role: "user", email: "test@example.com" };

    it("토큰이 게스트용이라면 UnauthorizedException을 던져야 합니다", async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ ...payload, role: "guest" });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it("저장된 토큰과 일치하지 않으면 UnauthorizedException을 던져야 합니다", async () => {
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockAuthRepository.getRefreshToken.mockResolvedValue("different-token");

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it("유효성 검사가 성공하면 새로운 토큰쌍을 반환해야 합니다", async () => {
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockAuthRepository.getRefreshToken.mockResolvedValue(refreshToken);
      mockAuthRepository.findUserById.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue("new-token");

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty("accessToken", "new-token");
      expect(result).toHaveProperty("refreshToken", "new-token");
      expect(mockAuthRepository.setRefreshToken).toHaveBeenCalled();
    });
  });

  describe("Guest Token", () => {
    const clientIp = "127.0.0.1";

    it("IP 제한을 초과하면 ForbiddenException을 던져야 합니다", async () => {
      mockAuthRepository.incrementIpCountAtomic.mockResolvedValue({
        allowed: false,
        count: GUEST_CONFIG.IP_LIMIT,
      });

      await expect(service.createGuestToken(clientIp)).rejects.toThrow(ForbiddenException);
    });

    it("IP 제한을 초과하지 않으면 게스트 토큰을 생성해야 합니다", async () => {
      mockAuthRepository.incrementIpCountAtomic.mockResolvedValue({ allowed: true, count: 1 });
      mockJwtService.signAsync.mockResolvedValue("guest-access-token");

      const result = await service.createGuestToken(clientIp);

      expect(result).toHaveProperty("accessToken", "guest-access-token");
      expect(result).toHaveProperty("guestId");
      expect(mockAuthRepository.createGuestSession).toHaveBeenCalled();
    });
  });

  describe("Auth Code Exchange", () => {
    const code = "valid-code";

    it("코드가 유효하지 않으면 UnauthorizedException을 던져야 합니다", async () => {
      mockAuthRepository.getAuthCode.mockResolvedValue(null);

      await expect(service.exchangeCodeForTokens(code)).rejects.toThrow(UnauthorizedException);
    });

    it("코드가 유효하면 유저를 반환하고 코드를 삭제해야 합니다", async () => {
      mockAuthRepository.getAuthCode.mockResolvedValue("user-123");
      mockAuthRepository.findUserById.mockResolvedValue(mockUser);

      const result = await service.exchangeCodeForTokens(code);

      expect(result).toEqual(mockUser);
      expect(mockAuthRepository.deleteAuthCode).toHaveBeenCalledWith(code);
    });

    it("유저가 존재하지 않으면 UnauthorizedException을 던져야 합니다", async () => {
      mockAuthRepository.getAuthCode.mockResolvedValue("user-123");
      mockAuthRepository.findUserById.mockResolvedValue(null);

      await expect(service.exchangeCodeForTokens(code)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("generateTokens", () => {
    const mockUserWithId = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      profileImage: "image.jpg",
      googleId: "google-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("액세스 토큰과 리프레시 토큰을 생성해야 합니다", async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token");

      const result = await service.generateTokens(mockUserWithId);

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockAuthRepository.setRefreshToken).toHaveBeenCalledWith("user-123", "refresh-token");
    });
  });

  describe("logout", () => {
    it("리프레시 토큰을 삭제해야 합니다", async () => {
      await service.logout("user-123");

      expect(mockAuthRepository.deleteRefreshToken).toHaveBeenCalledWith("user-123");
    });
  });

  describe("createAuthCode", () => {
    it("인증 코드를 생성하고 저장해야 합니다", async () => {
      const result = await service.createAuthCode("user-123");

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(mockAuthRepository.saveAuthCode).toHaveBeenCalledWith(result, "user-123");
    });
  });

  describe("refreshGuestToken", () => {
    const guestId = "guest-123";
    const clientIp = "127.0.0.1";

    it("게스트 세션이 없으면 UnauthorizedException을 던져야 합니다", async () => {
      mockAuthRepository.getGuestSession.mockResolvedValue(null);

      await expect(service.refreshGuestToken(guestId, clientIp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("IP가 일치하지 않으면 ForbiddenException을 던져야 합니다", async () => {
      mockAuthRepository.getGuestSession.mockResolvedValue({
        ipHash: "different-ip-hash",
        usageCount: 0,
        maxUsage: 10,
      });

      await expect(service.refreshGuestToken(guestId, clientIp)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("사용량 제한을 초과하면 ForbiddenException을 던져야 합니다", async () => {
      const ipHash = createHash("sha256").update(clientIp).digest("hex").substring(0, 32);

      mockAuthRepository.getGuestSession.mockResolvedValue({
        ipHash,
        usageCount: 10,
        maxUsage: 10,
      });

      await expect(service.refreshGuestToken(guestId, clientIp)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("유효한 게스트 세션이면 새 토큰을 반환해야 합니다", async () => {
      const ipHash = createHash("sha256").update(clientIp).digest("hex").substring(0, 32);

      mockAuthRepository.getGuestSession.mockResolvedValue({
        ipHash,
        usageCount: 5,
        maxUsage: 10,
      });
      mockJwtService.signAsync.mockResolvedValue("new-guest-token");

      const result = await service.refreshGuestToken(guestId, clientIp);

      expect(result).toHaveProperty("accessToken", "new-guest-token");
      expect(result).toHaveProperty("guestId", guestId);
      expect(result).toHaveProperty("usageCount", 5);
      expect(result).toHaveProperty("maxUsage", 10);
    });
  });

  describe("incrementGuestUsage", () => {
    const guestId = "guest-123";

    it("게스트 세션이 없으면 UnauthorizedException을 던져야 합니다", async () => {
      mockAuthRepository.incrementGuestUsageAtomic.mockResolvedValue({
        success: false,
        reason: "not_found",
      });

      await expect(service.incrementGuestUsage(guestId)).rejects.toThrow(UnauthorizedException);
    });

    it("사용량을 증가시키고 반환해야 합니다", async () => {
      mockAuthRepository.incrementGuestUsageAtomic.mockResolvedValue({
        success: true,
        newCount: 6,
        maxUsage: 10,
      });

      const result = await service.incrementGuestUsage(guestId);

      expect(result).toEqual({ usageCount: 6, maxUsage: 10 });
      expect(mockAuthRepository.incrementGuestUsageAtomic).toHaveBeenCalledWith(guestId);
    });

    it("사용량 제한 초과 시 현재 상태를 반환해야 합니다", async () => {
      mockAuthRepository.incrementGuestUsageAtomic.mockResolvedValue({
        success: false,
        reason: "limit_exceeded",
      });
      mockAuthRepository.getGuestSession.mockResolvedValue({
        usageCount: 10,
        maxUsage: 10,
      });

      const result = await service.incrementGuestUsage(guestId);

      expect(result).toEqual({ usageCount: 10, maxUsage: 10 });
    });
  });

  describe("getGuestInfo", () => {
    const guestId = "guest-123";

    it("게스트 세션이 없으면 null을 반환해야 합니다", async () => {
      mockAuthRepository.getGuestSession.mockResolvedValue(null);

      const result = await service.getGuestInfo(guestId);

      expect(result).toBeNull();
    });

    it("게스트 정보를 반환해야 합니다", async () => {
      mockAuthRepository.getGuestSession.mockResolvedValue({
        usageCount: 3,
        maxUsage: 10,
      });

      const result = await service.getGuestInfo(guestId);

      expect(result).toEqual({ usageCount: 3, maxUsage: 10 });
    });
  });

  describe("Refresh Token - Edge Cases", () => {
    it("유저를 찾을 수 없으면 UnauthorizedException을 던져야 합니다", async () => {
      const refreshToken = "valid-refresh-token";
      const payload = { sub: "user-123", role: "user", email: "test@example.com" };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockAuthRepository.getRefreshToken.mockResolvedValue(refreshToken);
      mockAuthRepository.findUserById.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it("JWT 검증 실패 시 UnauthorizedException을 던져야 합니다", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("jwt malformed"));

      await expect(service.refreshTokens("invalid-token")).rejects.toThrow(UnauthorizedException);
    });
  });
});
