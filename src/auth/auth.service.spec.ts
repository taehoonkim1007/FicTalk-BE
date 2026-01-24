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
    incrementIpCount: jest.fn(),
    createGuestSession: jest.fn(),
    incrementGuestUsage: jest.fn(),
    getGuestSession: jest.fn(),
    guestSessionExists: jest.fn(),
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
      mockAuthRepository.incrementIpCount.mockResolvedValue(GUEST_CONFIG.IP_LIMIT + 1); // Limit 초과

      await expect(service.createGuestToken(clientIp)).rejects.toThrow(ForbiddenException);
    });

    it("IP 제한을 초과하지 않으면 게스트 토큰을 생성해야 합니다", async () => {
      mockAuthRepository.incrementIpCount.mockResolvedValue(1);
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
  });
});
