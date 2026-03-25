import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";

import { GUEST_CONFIG, REDIS_KEY_PREFIX } from "../../auth/constants";
import { RedisService } from "../../redis/redis.service";
import { ChatMessageResponse } from "../dto";

interface GuestChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

@Injectable()
export class GuestChatRepository {
  constructor(private readonly redisService: RedisService) {}

  private getMessageKey(guestId: string, characterId: string): string {
    return `${REDIS_KEY_PREFIX.GUEST.CHAT}${guestId}:${characterId}`;
  }

  private getCharactersKey(guestId: string): string {
    return `${REDIS_KEY_PREFIX.GUEST.CHAT_CHARACTERS}${guestId}`;
  }

  /**
   * 메시지 저장
   */
  async saveMessage(
    guestId: string,
    characterId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<ChatMessageResponse> {
    const message: GuestChatMessage = {
      id: randomUUID(),
      role,
      content,
      createdAt: Date.now(),
    };

    const key = this.getMessageKey(guestId, characterId);
    await this.redisService.rpush(key, JSON.stringify(message));
    await this.redisService.pexpire(key, GUEST_CONFIG.TTL_MS);

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: new Date(message.createdAt),
    };
  }

  /**
   * 메시지 목록 조회
   */
  async getMessages(
    guestId: string,
    characterId: string,
    limit: number = 50,
  ): Promise<{ messages: ChatMessageResponse[]; nextCursor: null; hasMore: false }> {
    const key = this.getMessageKey(guestId, characterId);
    const raw = await this.redisService.lrange(key, -limit, -1);

    const messages = raw.map((str) => {
      const msg = JSON.parse(str) as GuestChatMessage;
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      };
    });

    // PostgreSQL과 동일하게 최신 메시지가 먼저 오도록 역순 정렬
    return { messages: messages.reverse(), nextCursor: null, hasMore: false };
  }

  /**
   * 최근 메시지 조회 (AI 컨텍스트용)
   */
  async getRecentMessages(
    guestId: string,
    characterId: string,
    limit: number = 20,
  ): Promise<{ role: string; content: string }[]> {
    const key = this.getMessageKey(guestId, characterId);
    const raw = await this.redisService.lrange(key, -limit, -1);

    return raw.map((str) => {
      const msg = JSON.parse(str) as GuestChatMessage;
      return { role: msg.role, content: msg.content };
    });
  }

  /**
   * 캐릭터 추가 (TTL 갱신 없음)
   */
  async addCharacter(guestId: string, characterId: string): Promise<void> {
    const key = this.getCharactersKey(guestId);
    await this.redisService.sadd(key, characterId);
    // TTL은 최초 생성 시에만 설정되며, 캐릭터 추가 시 갱신하지 않음
  }

  /**
   * 캐릭터 원자적 추가 (Race Condition 방지)
   * @returns "added" - 새로 추가됨, "exists" - 이미 존재, "limit" - 제한 초과
   */
  async addCharacterAtomic(
    guestId: string,
    characterId: string,
    maxCharacters: number,
  ): Promise<"added" | "exists" | "limit"> {
    const key = this.getCharactersKey(guestId);

    // Lua Script: 이미 존재하면 "exists", 제한 초과면 "limit", 추가 성공하면 "added"
    const script = `
      local key = KEYS[1]
      local characterId = ARGV[1]
      local maxCount = tonumber(ARGV[2])

      -- 이미 존재하는지 확인
      if redis.call('SISMEMBER', key, characterId) == 1 then
        return 'exists'
      end

      -- 현재 개수 확인
      local count = redis.call('SCARD', key)
      if count >= maxCount then
        return 'limit'
      end

      -- 추가
      redis.call('SADD', key, characterId)
      return 'added'
    `;

    const result = await this.redisService.eval(script, [key], [characterId, maxCharacters]);
    return result as "added" | "exists" | "limit";
  }

  /**
   * 캐릭터 목록 조회
   */
  async getCharacterIds(guestId: string): Promise<string[]> {
    const key = this.getCharactersKey(guestId);
    return this.redisService.smembers(key);
  }

  /**
   * 캐릭터 존재 확인
   */
  async hasCharacter(guestId: string, characterId: string): Promise<boolean> {
    const key = this.getCharactersKey(guestId);
    return this.redisService.sismember(key, characterId);
  }

  /**
   * 캐릭터 제거 (메시지도 함께 삭제)
   */
  async removeCharacter(guestId: string, characterId: string): Promise<void> {
    const charactersKey = this.getCharactersKey(guestId);
    await this.redisService.srem(charactersKey, characterId);

    const messageKey = this.getMessageKey(guestId, characterId);
    await this.redisService.del(messageKey);
  }

  /**
   * 대화 초기화 (메시지만 삭제)
   */
  async deleteMessages(guestId: string, characterId: string): Promise<void> {
    const key = this.getMessageKey(guestId, characterId);
    await this.redisService.del(key);
  }

  /**
   * 메시지 저장 + 사용량 증가를 단일 Lua 스크립트로 원자적 실행
   * 세션 만료/사용량 초과 시 메시지 저장 없이 실패 반환
   */
  async saveMessagesAtomic(
    guestId: string,
    characterId: string,
    userContent: string,
    aiContent: string,
  ): Promise<
    | {
        success: true;
        userMessage: ChatMessageResponse;
        aiMessage: ChatMessageResponse;
        usageCount: number;
        maxUsage: number;
      }
    | { success: false; reason: "not_found" | "limit_exceeded" }
  > {
    const now = Date.now();

    const userMsg: GuestChatMessage = {
      id: randomUUID(),
      role: "user",
      content: userContent,
      createdAt: now,
    };

    const aiMsg: GuestChatMessage = {
      id: randomUUID(),
      role: "assistant",
      content: aiContent,
      createdAt: now + 1,
    };

    const messageKey = this.getMessageKey(guestId, characterId);
    const usageKey = `${REDIS_KEY_PREFIX.GUEST.USAGE}${guestId}`;

    const script = `
      local messageKey = KEYS[1]
      local usageKey = KEYS[2]
      local userMsg = ARGV[1]
      local aiMsg = ARGV[2]
      local ttlMs = tonumber(ARGV[3])

      -- 세션 존재 확인
      if redis.call('EXISTS', usageKey) == 0 then
        return {'not_found', 0, 0}
      end

      -- 사용량 제한 확인
      local currentCount = tonumber(redis.call('HGET', usageKey, 'usageCount')) or 0
      local maxUsage = tonumber(redis.call('HGET', usageKey, 'maxUsage')) or 0

      if currentCount >= maxUsage then
        return {'limit_exceeded', currentCount, maxUsage}
      end

      -- 메시지 저장 + 사용량 증가 (원자적)
      redis.call('RPUSH', messageKey, userMsg)
      redis.call('RPUSH', messageKey, aiMsg)
      redis.call('PEXPIRE', messageKey, ttlMs)
      local newCount = redis.call('HINCRBY', usageKey, 'usageCount', 1)

      return {'ok', newCount, maxUsage}
    `;

    const result = (await this.redisService.eval(
      script,
      [messageKey, usageKey],
      [JSON.stringify(userMsg), JSON.stringify(aiMsg), GUEST_CONFIG.TTL_MS],
    )) as [string, number, number];

    if (result[0] === "not_found") {
      return { success: false, reason: "not_found" };
    }
    if (result[0] === "limit_exceeded") {
      return { success: false, reason: "limit_exceeded" };
    }

    return {
      success: true,
      userMessage: {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        createdAt: new Date(userMsg.createdAt),
      },
      aiMessage: {
        id: aiMsg.id,
        role: aiMsg.role,
        content: aiMsg.content,
        createdAt: new Date(aiMsg.createdAt),
      },
      usageCount: result[1],
      maxUsage: result[2],
    };
  }
}
