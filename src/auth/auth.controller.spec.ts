import { createMock } from "@golevelup/ts-jest";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { type Response } from "express";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { REFRESH_TOKEN_TTL } from "./constants";
import type {
  AuthenticatedGuest,
  AuthenticatedRegularUser,
  GoogleAuthRequest,
  GoogleProfile,
  RequestWithRefreshToken,
} from "./types/auth.types";

describe("AuthController", () => {
  let controller: AuthController;

  const mockRegularUser: AuthenticatedRegularUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    profileImage: "image.jpg",
    role: "user",
  };

  const mockGuestUser: AuthenticatedGuest = {
    id: "guest-123",
    email: null,
    role: "guest",
    usageCount: 0,
    maxUsage: 10,
  };

  const mockAuthService = {
    validateGoogleUser: jest.fn(),
    createAuthCode: jest.fn(),
    exchangeCodeForTokens: jest.fn(),
    generateTokens: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    createGuestToken: jest.fn(),
    refreshGuestToken: jest.fn(),
    deleteAccount: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue("http://localhost:3000"),
  };

  const mockRedirect = jest.fn();
  const mockCookie = jest.fn();
  const mockClearCookie = jest.fn();

  const mockResponse = createMock<Response>({
    redirect: mockRedirect,
    cookie: mockCookie,
    clearCookie: mockClearCookie,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("컨트롤러가 정의되어 있어야 합니다", () => {
    expect(controller).toBeDefined();
  });

  describe("googleAuth", () => {
    it("Guard가 처리하므로 함수가 정의되어 있어야 합니다", () => {
      expect(typeof controller.googleAuth).toBe("function");
      controller.googleAuth();
    });
  });

  describe("googleAuthCallback", () => {
    it("Google 프로필로 유저를 검증하고 프론트엔드로 리다이렉트해야 합니다", async () => {
      const googleProfile: GoogleProfile = {
        id: "google-123",
        email: "test@example.com",
        name: "Test User",
        picture: "image.jpg",
      };
      const mockRequest = { user: googleProfile } as GoogleAuthRequest;

      mockAuthService.validateGoogleUser.mockResolvedValue(mockRegularUser);
      mockAuthService.createAuthCode.mockResolvedValue("auth-code-123");

      await controller.googleAuthCallback(mockRequest, mockResponse);

      expect(mockAuthService.validateGoogleUser).toHaveBeenCalledWith(googleProfile);
      expect(mockAuthService.createAuthCode).toHaveBeenCalledWith("user-123");
      expect(mockRedirect).toHaveBeenCalledWith(
        "http://localhost:3000/auth/callback?code=auth-code-123",
      );
    });
  });

  describe("exchangeCode", () => {
    it("코드를 토큰으로 교환하고 refreshToken 쿠키를 설정해야 합니다", async () => {
      mockAuthService.exchangeCodeForTokens.mockResolvedValue(mockRegularUser);
      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const result = await controller.exchangeCode({ code: "auth-code" }, mockResponse);

      expect(result).toEqual({ accessToken: "access-token" });
      expect(mockCookie).toHaveBeenCalledWith("refreshToken", "refresh-token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_TTL,
      });
    });
  });

  describe("refresh", () => {
    it("refreshToken이 없으면 UnauthorizedException을 던져야 합니다", async () => {
      const mockRequest = { cookies: {} } as RequestWithRefreshToken;

      await expect(controller.refresh(mockRequest, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("새로운 토큰쌍을 반환하고 쿠키를 갱신해야 합니다", async () => {
      const mockRequest = {
        cookies: { refreshToken: "old-refresh-token" },
      } as RequestWithRefreshToken;
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(result).toEqual({ accessToken: "new-access-token" });
      expect(mockCookie).toHaveBeenCalledWith("refreshToken", "new-refresh-token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_TTL,
      });
    });
  });

  describe("logout", () => {
    it("일반 유저 로그아웃 시 서비스를 호출하고 쿠키를 제거해야 합니다", async () => {
      const result = await controller.logout(mockRegularUser, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith("user-123");
      expect(mockClearCookie).toHaveBeenCalledWith("refreshToken", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });
      expect(result).toEqual({ message: "Logged out successfully" });
    });

    it("게스트 유저 로그아웃 시 서비스를 호출하지 않아야 합니다", async () => {
      const result = await controller.logout(mockGuestUser, mockResponse);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockClearCookie).toHaveBeenCalled();
      expect(result).toEqual({ message: "Logged out successfully" });
    });
  });

  describe("deleteAccount", () => {
    it("게스트 유저는 ForbiddenException을 던져야 합니다", async () => {
      await expect(controller.deleteAccount(mockGuestUser, mockResponse)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAuthService.deleteAccount).not.toHaveBeenCalled();
    });

    it("일반 유저는 계정을 삭제하고 쿠키를 제거해야 합니다", async () => {
      const result = await controller.deleteAccount(mockRegularUser, mockResponse);

      expect(mockAuthService.deleteAccount).toHaveBeenCalledWith("user-123");
      expect(mockClearCookie).toHaveBeenCalledWith("refreshToken", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });
      expect(result).toEqual({ message: "Account deleted successfully" });
    });
  });

  describe("getMe", () => {
    it("일반 유저 정보를 반환해야 합니다", () => {
      const result = controller.getMe(mockRegularUser);

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        profileImage: "image.jpg",
        role: "user",
      });
    });

    it("게스트 유저 정보를 반환해야 합니다", () => {
      const result = controller.getMe(mockGuestUser);

      expect(result).toEqual({
        id: "guest-123",
        email: null,
        role: "guest",
        usageCount: 0,
        maxUsage: 10,
      });
    });
  });

  describe("guestToken", () => {
    const clientIp = "127.0.0.1";

    it("guestId가 있으면 토큰을 갱신해야 합니다", async () => {
      const mockResponse = {
        accessToken: "guest-token",
        guestId: "guest-123",
        usageCount: 5,
        maxUsage: 10,
      };
      mockAuthService.refreshGuestToken.mockResolvedValue(mockResponse);

      const result = await controller.guestToken({ guestId: "guest-123" }, clientIp);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshGuestToken).toHaveBeenCalledWith("guest-123", clientIp);
    });

    it("guestId가 없으면 새 토큰을 생성해야 합니다", async () => {
      const mockResponse = {
        accessToken: "new-guest-token",
        guestId: "new-guest-123",
        usageCount: 0,
        maxUsage: 10,
      };
      mockAuthService.createGuestToken.mockResolvedValue(mockResponse);

      const result = await controller.guestToken({}, clientIp);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.createGuestToken).toHaveBeenCalledWith(clientIp);
    });
  });
});
