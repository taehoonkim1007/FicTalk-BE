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

  /**
   * 게스트 사용량 원자적 증가 및 제한 확인 (TOCTOU 방지)
   * @returns { success: true, newCount, maxUsage } 또는 { success: false, reason: "not_found" | "limit_exceeded" }
   */
  async incrementGuestUsageAtomic(
    guestId: string,
  ): Promise<
    | { success: true; newCount: number; maxUsage: number }
    | { success: false; reason: "not_found" | "limit_exceeded" }
  > {
    const key = `${REDIS_KEY_PREFIX.GUEST.USAGE}${guestId}`;

    const script = `
      local key = KEYS[1]

      -- 세션 존재 확인
      if redis.call('EXISTS', key) == 0 then
        return {'not_found', 0, 0}
      end

      local currentCount = tonumber(redis.call('HGET', key, 'usageCount')) or 0
      local maxUsage = tonumber(redis.call('HGET', key, 'maxUsage')) or 0

      -- 제한 확인 (증가 전)
      if currentCount >= maxUsage then
        return {'limit_exceeded', currentCount, maxUsage}
      end

      -- 증가
      local newCount = redis.call('HINCRBY', key, 'usageCount', 1)
      return {'ok', newCount, maxUsage}
    `;

    const result = (await this.redisService.eval(script, [key], [])) as [string, number, number];

    if (result[0] === "not_found") {
      return { success: false, reason: "not_found" };
    }
    if (result[0] === "limit_exceeded") {
      return { success: false, reason: "limit_exceeded" };
    }
    return { success: true, newCount: result[1], maxUsage: result[2] };
  }

  // ========================
  // Guest IP 제한 관리
  // ========================

  /**
   * IP 카운트 원자적 증가 및 제한 확인 (Race Condition 방지)
   * @returns { allowed: true, count } 또는 { allowed: false, count }
   */
  async incrementIpCountAtomic(
    ipHash: string,
    limit: number,
  ): Promise<{ allowed: boolean; count: number }> {
    const key = `${REDIS_KEY_PREFIX.GUEST.IP_LIMIT}${ipHash}`;
    const ttlMs = GUEST_CONFIG.TTL_MS;

    const script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local ttlMs = tonumber(ARGV[2])

      -- 현재 카운트 확인
      local currentCount = tonumber(redis.call('GET', key)) or 0

      -- 제한 초과 확인 (증가 전)
      if currentCount >= limit then
        return {0, currentCount}
      end

      -- 증가
      local newCount = redis.call('INCR', key)

      -- 첫 번째 증가 시 TTL 설정
      if newCount == 1 then
        redis.call('PEXPIRE', key, ttlMs)
      end

      return {1, newCount}
    `;

    const result = (await this.redisService.eval(script, [key], [limit, ttlMs])) as [
      number,
      number,
    ];

    return { allowed: result[0] === 1, count: result[1] };
  }
}
