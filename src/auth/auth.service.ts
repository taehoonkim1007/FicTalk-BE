import * as crypto from "crypto";
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { type User } from "@prisma/client";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { FileStorageService } from "../common/services/file-storage.service";
import { GUEST_CONFIG, JWT_EXPIRES } from "./constants";
import { type GuestTokenResponse } from "./dto/guest-token.dto";
import { AuthRepository } from "./repositories/auth.repository";
import { type GoogleProfile, type JwtPayload, type UpdateProfileData } from "./types/auth.types";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User> {
    let user = await this.authRepository.findUserByGoogleId(profile.id);

    if (!user) {
      user = await this.authRepository.createUser({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        profileImage: profile.picture,
      });
      // 신규 유저 생성 로그 생략 (User Request)
    }

    return user;
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: "user",
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        expiresIn: JWT_EXPIRES.ACCESS,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: JWT_EXPIRES.REFRESH,
      }),
    ]);

    await this.authRepository.setRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });

      if (payload.role === "guest") {
        this.logger.warn(`Refresh attempt with Guest Token: ${payload.sub}`);
        throw new UnauthorizedException("Guest tokens cannot be refreshed");
      }

      const storedToken = await this.authRepository.getRefreshToken(payload.sub);

      if (!storedToken || storedToken !== refreshToken) {
        this.logger.warn(`Invalid/Mismatched Refresh Token for User: ${payload.sub}`);
        throw new UnauthorizedException("Invalid refresh token");
      }

      const user = await this.authRepository.findUserById(payload.sub);

      if (!user) {
        this.logger.warn(`User Not Found during Refresh: ${payload.sub}`);
        throw new UnauthorizedException("User not found");
      }

      return this.generateTokens(user);
    } catch (error) {
      // JWT Verify 실패 시 등
      if (error instanceof Error && error.message !== "Invalid refresh token") {
        this.logger.warn(`Refresh Token Verify Failed: ${error.message}`);
      }
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.deleteRefreshToken(userId);
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<{ id: string; name: string; profileImage: string | null }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const updateData: UpdateProfileData = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.profileImage !== undefined) {
      const savedImagePath = await this.fileStorageService.processImage(
        data.profileImage,
        "users/profileImage",
      );

      if (savedImagePath) {
        // 기존 이미지 삭제 (새 이미지로 교체 시)
        if (user.profileImage) {
          await this.fileStorageService.deleteImage(user.profileImage);
        }
        updateData.profileImage = savedImagePath;
      }
    }

    const updatedUser = await this.authRepository.updateUser(userId, updateData);

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      profileImage: updatedUser.profileImage,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    await this.authRepository.deleteRefreshToken(userId);
    await this.authRepository.deleteUser(userId);

    this.logger.log(`Account Deleted: ${user.email} (ID: ${userId})`);
  }

  // ========================
  // Auth Code 교환 메서드
  // ========================

  async createAuthCode(userId: string): Promise<string> {
    const code = crypto.randomUUID();
    await this.authRepository.saveAuthCode(code, userId);
    return code;
  }

  async exchangeCodeForTokens(code: string): Promise<User> {
    const userId = await this.authRepository.getAuthCode(code);

    if (!userId) {
      this.logger.warn(`Invalid Code Exchange Attempt`);
      throw new UnauthorizedException("Invalid or expired code");
    }

    await this.authRepository.deleteAuthCode(code); // 1회용

    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return user;
  }

  // ========================
  // Guest 메서드
  // ========================

  private hashIp(ip: string): string {
    return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 32);
  }

  async createGuestToken(clientIp: string): Promise<GuestTokenResponse> {
    const ipHash = this.hashIp(clientIp);

    // 원자적으로 IP 카운트 증가 및 제한 확인 (Race Condition 방지)
    const ipResult = await this.authRepository.incrementIpCountAtomic(
      ipHash,
      GUEST_CONFIG.IP_LIMIT,
    );

    if (!ipResult.allowed) {
      this.logger.warn(`Guest IP Limit Exceeded: ${clientIp} (${ipResult.count})`);
      throw new ForbiddenException(
        `IP limit exceeded. Maximum ${GUEST_CONFIG.IP_LIMIT} guest accounts per IP.`,
      );
    }

    const guestId = crypto.randomUUID();

    await this.authRepository.createGuestSession(guestId, {
      maxUsage: GUEST_CONFIG.MAX_USAGE,
      ipHash: ipHash,
      createdAt: Date.now(),
    });

    const accessToken = await this.generateGuestAccessToken(guestId);

    return {
      accessToken,
      guestId,
      usageCount: 0,
      maxUsage: GUEST_CONFIG.MAX_USAGE,
      expiresIn: GUEST_CONFIG.ACCESS_EXPIRES,
    };
  }

  async refreshGuestToken(guestId: string, clientIp: string): Promise<GuestTokenResponse> {
    const ipHash = this.hashIp(clientIp);

    const guestData = await this.authRepository.getGuestSession(guestId);

    if (!guestData) {
      this.logger.warn(`Guest Session Not Found on Refresh: ${guestId}`);
      throw new UnauthorizedException("Guest session expired or not found");
    }

    if (guestData.ipHash !== ipHash) {
      this.logger.warn(
        `Guest IP Mismatch: ${guestId} (Stored: ${guestData.ipHash}, Request: ${ipHash})`,
      );
      throw new ForbiddenException(
        "IP mismatch. Guest token cannot be refreshed from different IP.",
      );
    }

    if (guestData.usageCount >= guestData.maxUsage) {
      this.logger.warn(`Guest Usage Limit on Refresh: ${guestId} (${guestData.usageCount})`);
      throw new ForbiddenException(
        `Guest usage limit exceeded. Maximum ${guestData.maxUsage} uses allowed.`,
      );
    }

    const accessToken = await this.generateGuestAccessToken(guestId);

    return {
      accessToken,
      guestId,
      usageCount: guestData.usageCount,
      maxUsage: guestData.maxUsage,
      expiresIn: GUEST_CONFIG.ACCESS_EXPIRES,
    };
  }

  private async generateGuestAccessToken(guestId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: guestId,
      email: null,
      role: "guest",
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("JWT_SECRET"),
      expiresIn: GUEST_CONFIG.ACCESS_EXPIRES,
    });
  }

  async incrementGuestUsage(guestId: string): Promise<{ usageCount: number; maxUsage: number }> {
    // 원자적으로 사용량 증가 및 제한 확인 (TOCTOU 방지)
    const result = await this.authRepository.incrementGuestUsageAtomic(guestId);

    if (!result.success) {
      if (result.reason === "not_found") {
        throw new UnauthorizedException("Guest session expired or not found");
      }
      // limit_exceeded - 사용량 제한 초과 시에도 현재 상태 반환 (호출자가 처리)
      const guestData = await this.authRepository.getGuestSession(guestId);
      return {
        usageCount: guestData?.usageCount ?? GUEST_CONFIG.MAX_USAGE,
        maxUsage: guestData?.maxUsage ?? GUEST_CONFIG.MAX_USAGE,
      };
    }

    this.logger.debug(`Guest Usage Incremented: ${guestId} -> ${result.newCount}`);

    return {
      usageCount: result.newCount,
      maxUsage: result.maxUsage,
    };
  }

  async getGuestInfo(guestId: string): Promise<{ usageCount: number; maxUsage: number } | null> {
    const guestData = await this.authRepository.getGuestSession(guestId);

    if (!guestData) {
      return null;
    }

    return {
      usageCount: guestData.usageCount,
      maxUsage: guestData.maxUsage,
    };
  }
}
