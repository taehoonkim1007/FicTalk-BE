import { Injectable } from "@nestjs/common";
import { type Prisma, type User } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AUTH_CODE_TTL, GUEST_CONFIG, REDIS_KEY_PREFIX, REFRESH_TOKEN_TTL } from "../constants";

export interface GuestSessionData {
  usageCount: number;
  maxUsage: number;
  ipHash: string;
  createdAt: number;
}

@Injectable()
export class AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ========================
  // User DB 관리
  // ========================

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  // ========================
  // Auth Code 관리 (OAuth 인증 코드)
  // ========================

  async saveAuthCode(code: string, userId: string): Promise<void> {
    const key = `${REDIS_KEY_PREFIX.AUTH_CODE}${code}`;
    await this.redisService.set(key, userId, AUTH_CODE_TTL);
  }

  async getAuthCode(code: string): Promise<string | null> {
    const key = `${REDIS_KEY_PREFIX.AUTH_CODE}${code}`;
    return this.redisService.get(key);
  }

  async deleteAuthCode(code: string): Promise<void> {
    const key = `${REDIS_KEY_PREFIX.AUTH_CODE}${code}`;
    await this.redisService.del(key);
  }

  // ========================
  // User Token 관리
  // ========================

  async setRefreshToken(userId: string, token: string): Promise<void> {
    const key = `${REDIS_KEY_PREFIX.USER.REFRESH_TOKEN}${userId}`;
    await this.redisService.set(key, token, REFRESH_TOKEN_TTL);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `${REDIS_KEY_PREFIX.USER.REFRESH_TOKEN}${userId}`;
    return this.redisService.get(key);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    const key = `${REDIS_KEY_PREFIX.USER.REFRESH_TOKEN}${userId}`;
    await this.redisService.del(key);
  }

  // ========================
  // Guest 세션 관리
  // ========================

  async createGuestSession(
    guestId: string,
    data: Omit<GuestSessionData, "usageCount">,
  ): Promise<void> {
    const key = `${REDIS_KEY_PREFIX.GUEST.USAGE}${guestId}`;
    await this.redisService.hsetWithTtl(
      key,
      {
        usageCount: 0,
        maxUsage: data.maxUsage,
        ipHash: data.ipHash,
        createdAt: data.createdAt,
      },
      GUEST_CONFIG.TTL_MS,
    );
  }

  async getGuestSession(guestId: string): Promise<GuestSessionData | null> {
    const key = `${REDIS_KEY_PREFIX.GUEST.USAGE}${guestId}`;
    const data = await this.redisService.hgetall(key);
    if (!data) return null;
    return {
      usageCount: parseInt(data.usageCount, 10),
      maxUsage: parseInt(data.maxUsage, 10),
      ipHash: data.ipHash,
      createdAt: parseInt(data.createdAt, 10),
    };
  }

  async incrementGuestUsage(guestId: string): Promise<number> {
    const key = `${REDIS_KEY_PREFIX.GUEST.USAGE}${guestId}`;
    return this.redisService.hincrby(key, "usageCount", 1);
  }

  async guestSessionExists(guestId: string): Promise<boolean> {
    const key = `${REDIS_KEY_PREFIX.GUEST.USAGE}${guestId}`;
    return this.redisService.exists(key);
  }

  // ========================
  // Guest IP 제한 관리
  // ========================

  async incrementIpCount(ipHash: string): Promise<number> {
    const key = `${REDIS_KEY_PREFIX.GUEST.IP_LIMIT}${ipHash}`;
    return this.redisService.incrementWithTtl(key, GUEST_CONFIG.TTL_MS);
  }
}
