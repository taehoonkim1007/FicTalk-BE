import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.getOrThrow<string>("REDIS_URL"));
  }

  getClient(): Redis {
    return this.client;
  }

  // ========================
  // 기본 메서드
  // ========================

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs) {
      await this.client.set(key, value, "PX", ttlMs);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ========================
  // Hash 메서드 (Guest 관리용)
  // ========================

  async hsetWithTtl(
    key: string,
    data: Record<string, string | number>,
    ttlMs: number,
  ): Promise<void> {
    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = String(v);
    }
    await this.client.hset(key, stringData);
    await this.client.pexpire(key, ttlMs);
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const data = await this.client.hgetall(key);
    return Object.keys(data).length > 0 ? data : null;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  // ========================
  // Counter 메서드 (IP 제한용)
  // ========================

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async incrementWithTtl(key: string, ttlMs: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.pexpire(key, ttlMs);
    }
    return value;
  }

  async pexpire(key: string, ttlMs: number): Promise<void> {
    await this.client.pexpire(key, ttlMs);
  }

  // ========================
  // List 메서드 (Guest 채팅용)
  // ========================

  async rpush(key: string, value: string): Promise<number> {
    return this.client.rpush(key, value);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // ========================
  // Set 메서드 (Guest 캐릭터 목록용)
  // ========================

  async sadd(key: string, member: string): Promise<number> {
    return this.client.sadd(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async srem(key: string, member: string): Promise<number> {
    return this.client.srem(key, member);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
