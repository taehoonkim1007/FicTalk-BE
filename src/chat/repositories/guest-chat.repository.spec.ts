import { Test, type TestingModule } from "@nestjs/testing";

import { RedisService } from "../../redis/redis.service";
import { GuestChatRepository } from "./guest-chat.repository";

jest.mock("crypto", () => ({
  randomUUID: jest.fn().mockReturnValueOnce("uuid-user-msg").mockReturnValueOnce("uuid-ai-msg"),
}));

describe("GuestChatRepository", () => {
  let repository: GuestChatRepository;

  const mockRedisService = {
    rpush: jest.fn(),
    lrange: jest.fn(),
    pexpire: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    srem: jest.fn(),
    sismember: jest.fn(),
    scard: jest.fn(),
    eval: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuestChatRepository, { provide: RedisService, useValue: mockRedisService }],
    }).compile();

    repository = module.get<GuestChatRepository>(GuestChatRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("saveMessagesAtomic", () => {
    const guestId = "guest-123";
    const characterId = "char-456";
    const userContent = "Hello";
    const aiContent = "Hi there!";

    it("성공 시 메시지와 사용량 정보를 반환해야 합니다", async () => {
      mockRedisService.eval.mockResolvedValue(["ok", 1, 3]);

      const result = await repository.saveMessagesAtomic(
        guestId,
        characterId,
        userContent,
        aiContent,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userMessage.content).toBe(userContent);
        expect(result.userMessage.role).toBe("user");
        expect(result.aiMessage.content).toBe(aiContent);
        expect(result.aiMessage.role).toBe("assistant");
        expect(result.usageCount).toBe(1);
        expect(result.maxUsage).toBe(3);
      }

      // Lua 스크립트가 2개 키(messageKey, usageKey)로 호출되었는지 확인
      expect(mockRedisService.eval).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.stringContaining("guest:chat:"),
          expect.stringContaining("guest:usage:"),
        ]),
        expect.arrayContaining([
          expect.stringContaining(userContent),
          expect.stringContaining(aiContent),
        ]),
      );
    });

    it("세션 만료 시 not_found를 반환해야 합니다", async () => {
      mockRedisService.eval.mockResolvedValue(["not_found", 0, 0]);

      const result = await repository.saveMessagesAtomic(
        guestId,
        characterId,
        userContent,
        aiContent,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("not_found");
      }
    });

    it("사용량 초과 시 limit_exceeded를 반환해야 합니다", async () => {
      mockRedisService.eval.mockResolvedValue(["limit_exceeded", 3, 3]);

      const result = await repository.saveMessagesAtomic(
        guestId,
        characterId,
        userContent,
        aiContent,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("limit_exceeded");
      }
    });

    it("단일 eval 호출로 원자적으로 실행되어야 합니다", async () => {
      mockRedisService.eval.mockResolvedValue(["ok", 1, 3]);

      await repository.saveMessagesAtomic(guestId, characterId, userContent, aiContent);

      // rpush, pexpire 등 개별 명령이 아닌 eval 한 번만 호출
      expect(mockRedisService.eval).toHaveBeenCalledTimes(1);
      expect(mockRedisService.rpush).not.toHaveBeenCalled();
      expect(mockRedisService.pexpire).not.toHaveBeenCalled();
    });
  });
});
