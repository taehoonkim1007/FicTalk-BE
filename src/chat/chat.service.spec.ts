import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { AiService } from "../ai/ai.service";
import { AuthService } from "../auth/auth.service";
import type { AuthenticatedGuest, AuthenticatedRegularUser } from "../auth/types/auth.types";
import { ChatService } from "./chat.service";
import { GUEST_MAX_CHARACTERS } from "./constants/chat.constants";
import { ChatRepository } from "./repositories/chat.repository";
import { GuestChatRepository } from "./repositories/guest-chat.repository";

describe("ChatService", () => {
  let service: ChatService;

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

  const mockCharacter = {
    id: "char-123",
    name: "Test Character",
    role: "주인공",
    description: "A test character",
    profileImage: "profile.jpg",
    backgroundImage: "bg.jpg",
    imageColor: "#ffffff",
    personality: "Friendly",
    firstMessage: "Hello!",
    voiceId: "voice-123",
    voiceSettings: { stability: 0.5, similarityBoost: 0.5, style: 0.5, speed: 1 },
    story: {
      id: "story-123",
      title: "Test Story",
      backgroundImage: "story-bg.jpg",
      summary: "Test summary",
    },
  };

  const mockChatRoom = {
    id: "chatroom-123",
    userId: "user-123",
  };

  const mockChatRepository = {
    findOrCreateChatRoom: jest.fn(),
    findChatRoomByUserId: jest.fn(),
    findChatCharacters: jest.fn(),
    findCharactersByIds: jest.fn(),
    findCharacterById: jest.fn(),
    addCharacter: jest.fn(),
    removeCharacter: jest.fn(),
    findChatRoomCharacter: jest.fn(),
    findChatRoomCharacterId: jest.fn(),
    findMessages: jest.fn(),
    findRecentMessages: jest.fn(),
    createMessagesInTransaction: jest.fn(),
    deleteMessages: jest.fn(),
  };

  const mockGuestChatRepository = {
    getCharacterIds: jest.fn(),
    hasCharacter: jest.fn(),
    addCharacter: jest.fn(),
    addCharacterAtomic: jest.fn(),
    removeCharacter: jest.fn(),
    getMessages: jest.fn(),
    getRecentMessages: jest.fn(),
    saveMessagesAtomic: jest.fn(),
    deleteMessages: jest.fn(),
  };

  const mockAiService = {
    generateChatResponse: jest.fn(),
  };

  const mockAuthService = {
    incrementGuestUsage: jest.fn(),
    getGuestInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatRepository, useValue: mockChatRepository },
        { provide: GuestChatRepository, useValue: mockGuestChatRepository },
        { provide: AiService, useValue: mockAiService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("서비스가 정의되어 있어야 합니다", () => {
    expect(service).toBeDefined();
  });

  describe("getOrCreateChatRoom", () => {
    it("채팅방을 조회하거나 생성해야 합니다", async () => {
      mockChatRepository.findOrCreateChatRoom.mockResolvedValue(mockChatRoom);

      const result = await service.getOrCreateChatRoom("user-123");

      expect(result).toEqual(mockChatRoom);
      expect(mockChatRepository.findOrCreateChatRoom).toHaveBeenCalledWith("user-123");
    });
  });

  describe("getChatCharacters", () => {
    it("일반 유저의 캐릭터 목록을 반환해야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
      mockChatRepository.findChatCharacters.mockResolvedValue([mockCharacter]);

      const result = await service.getChatCharacters(mockRegularUser);

      expect(result.characters).toHaveLength(1);
      expect(mockChatRepository.findChatRoomByUserId).toHaveBeenCalledWith("user-123");
    });

    it("채팅방이 없는 일반 유저는 빈 배열을 반환해야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(null);

      const result = await service.getChatCharacters(mockRegularUser);

      expect(result.characters).toEqual([]);
    });

    it("게스트 유저의 캐릭터 목록을 반환해야 합니다", async () => {
      mockGuestChatRepository.getCharacterIds.mockResolvedValue(["char-123"]);
      mockChatRepository.findCharactersByIds.mockResolvedValue([mockCharacter]);

      const result = await service.getChatCharacters(mockGuestUser);

      expect(result.characters).toHaveLength(1);
      expect(mockGuestChatRepository.getCharacterIds).toHaveBeenCalledWith("guest-123");
    });

    it("캐릭터가 없는 게스트는 빈 배열을 반환해야 합니다", async () => {
      mockGuestChatRepository.getCharacterIds.mockResolvedValue([]);

      const result = await service.getChatCharacters(mockGuestUser);

      expect(result.characters).toEqual([]);
    });
  });

  describe("addCharacter", () => {
    it("존재하지 않는 캐릭터를 추가하면 NotFoundException을 던져야 합니다", async () => {
      mockChatRepository.findCharacterById.mockResolvedValue(null);

      await expect(service.addCharacter(mockRegularUser, "invalid-char")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("일반 유저가 캐릭터를 추가할 수 있어야 합니다", async () => {
      mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
      mockChatRepository.findOrCreateChatRoom.mockResolvedValue(mockChatRoom);

      const result = await service.addCharacter(mockRegularUser, "char-123");

      expect(result.id).toBe("char-123");
      expect(mockChatRepository.addCharacter).toHaveBeenCalledWith("chatroom-123", "char-123");
    });

    it("게스트가 이미 가진 캐릭터를 추가하면 그대로 반환해야 합니다", async () => {
      mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
      mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("exists");

      const result = await service.addCharacter(mockGuestUser, "char-123");

      expect(result.id).toBe("char-123");
      expect(mockGuestChatRepository.addCharacterAtomic).toHaveBeenCalledWith(
        "guest-123",
        "char-123",
        GUEST_MAX_CHARACTERS,
      );
    });

    it("게스트가 캐릭터 제한을 초과하면 ForbiddenException을 던져야 합니다", async () => {
      mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
      mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("limit");

      await expect(service.addCharacter(mockGuestUser, "char-123")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("게스트가 새 캐릭터를 추가할 수 있어야 합니다", async () => {
      mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
      mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("added");

      const result = await service.addCharacter(mockGuestUser, "char-123");

      expect(result.id).toBe("char-123");
      expect(mockGuestChatRepository.addCharacterAtomic).toHaveBeenCalledWith(
        "guest-123",
        "char-123",
        GUEST_MAX_CHARACTERS,
      );
    });
  });

  describe("removeCharacter", () => {
    it("게스트가 없는 캐릭터를 제거하면 NotFoundException을 던져야 합니다", async () => {
      mockGuestChatRepository.hasCharacter.mockResolvedValue(false);

      await expect(service.removeCharacter(mockGuestUser, "char-123")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("게스트가 캐릭터를 제거할 수 있어야 합니다", async () => {
      mockGuestChatRepository.hasCharacter.mockResolvedValue(true);

      await service.removeCharacter(mockGuestUser, "char-123");

      expect(mockGuestChatRepository.removeCharacter).toHaveBeenCalledWith("guest-123", "char-123");
    });

    it("채팅방이 없는 일반 유저가 제거하면 NotFoundException을 던져야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(null);

      await expect(service.removeCharacter(mockRegularUser, "char-123")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("채팅방에 없는 캐릭터를 제거하면 NotFoundException을 던져야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
      mockChatRepository.findChatRoomCharacter.mockResolvedValue(null);

      await expect(service.removeCharacter(mockRegularUser, "char-123")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("일반 유저가 캐릭터를 제거할 수 있어야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
      mockChatRepository.findChatRoomCharacter.mockResolvedValue({ id: "crc-123" });

      await service.removeCharacter(mockRegularUser, "char-123");

      expect(mockChatRepository.removeCharacter).toHaveBeenCalledWith("chatroom-123", "char-123");
    });
  });

  describe("getMessages", () => {
    it("게스트의 메시지를 반환해야 합니다", async () => {
      const mockMessages = { messages: [], nextCursor: null, hasMore: false };
      mockGuestChatRepository.getMessages.mockResolvedValue(mockMessages);

      const result = await service.getMessages(mockGuestUser, "char-123");

      expect(result).toEqual(mockMessages);
      expect(mockGuestChatRepository.getMessages).toHaveBeenCalledWith("guest-123", "char-123", 50);
    });

    it("채팅방이 없는 일반 유저는 빈 메시지를 반환해야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(null);

      const result = await service.getMessages(mockRegularUser, "char-123");

      expect(result).toEqual({ messages: [], nextCursor: null, hasMore: false });
    });

    it("일반 유저의 메시지를 반환해야 합니다", async () => {
      const mockMessages = { messages: [], nextCursor: null, hasMore: false };
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
      mockChatRepository.findMessages.mockResolvedValue(mockMessages);

      const result = await service.getMessages(mockRegularUser, "char-123", "cursor-123", 20);

      expect(result).toEqual(mockMessages);
      expect(mockChatRepository.findMessages).toHaveBeenCalledWith(
        "chatroom-123",
        "char-123",
        "cursor-123",
        20,
      );
    });
  });

  describe("sendMessage", () => {
    const aiResponse = "AI Response";

    describe("게스트 메시지", () => {
      it("존재하지 않는 캐릭터에게 메시지를 보내면 NotFoundException을 던져야 합니다", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(null);

        await expect(service.sendMessage(mockGuestUser, "invalid-char", "Hello")).rejects.toThrow(
          NotFoundException,
        );
      });

      it("게스트가 캐릭터 제한을 초과하면 ForbiddenException을 던져야 합니다", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("limit");

        await expect(service.sendMessage(mockGuestUser, "char-123", "Hello")).rejects.toThrow(
          ForbiddenException,
        );
      });

      it("게스트 세션이 만료되면 UnauthorizedException을 던져야 합니다", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("exists");
        mockGuestChatRepository.getRecentMessages.mockResolvedValue([]);
        mockAuthService.getGuestInfo.mockResolvedValue(null);

        await expect(service.sendMessage(mockGuestUser, "char-123", "Hello")).rejects.toThrow(
          UnauthorizedException,
        );
        expect(mockAiService.generateChatResponse).not.toHaveBeenCalled();
      });

      it("사용량 초과 시 AI 호출 없이 ForbiddenException을 던져야 합니다", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("exists");
        mockGuestChatRepository.getRecentMessages.mockResolvedValue([]);
        mockAuthService.getGuestInfo.mockResolvedValue({ usageCount: 3, maxUsage: 3 });

        await expect(service.sendMessage(mockGuestUser, "char-123", "Hello")).rejects.toThrow(
          ForbiddenException,
        );
        expect(mockAiService.generateChatResponse).not.toHaveBeenCalled();
      });

      it("게스트가 메시지를 보낼 수 있어야 합니다 (기존 캐릭터)", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("exists");
        mockGuestChatRepository.getRecentMessages.mockResolvedValue([]);
        mockAuthService.getGuestInfo.mockResolvedValue({ usageCount: 0, maxUsage: 3 });
        mockAiService.generateChatResponse.mockResolvedValue(aiResponse);
        mockGuestChatRepository.saveMessagesAtomic.mockResolvedValue({
          success: true,
          userMessage: { id: "msg-1", content: "Hello", role: "user" },
          aiMessage: { id: "msg-2", content: aiResponse, role: "assistant" },
          usageCount: 1,
          maxUsage: 3,
        });

        const result = await service.sendMessage(mockGuestUser, "char-123", "Hello");

        expect(result.userMessage.content).toBe("Hello");
        expect(result.aiMessage.content).toBe(aiResponse);
        expect(result.usageCount).toBe(1);
        expect(result.maxUsage).toBe(3);
        expect(mockAuthService.incrementGuestUsage).not.toHaveBeenCalled();
      });

      it("게스트가 메시지를 보낼 수 있어야 합니다 (새 캐릭터 추가)", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("added");
        mockGuestChatRepository.getRecentMessages.mockResolvedValue([]);
        mockAuthService.getGuestInfo.mockResolvedValue({ usageCount: 0, maxUsage: 3 });
        mockAiService.generateChatResponse.mockResolvedValue(aiResponse);
        mockGuestChatRepository.saveMessagesAtomic.mockResolvedValue({
          success: true,
          userMessage: { id: "msg-1", content: "Hello", role: "user" },
          aiMessage: { id: "msg-2", content: aiResponse, role: "assistant" },
          usageCount: 1,
          maxUsage: 3,
        });

        const result = await service.sendMessage(mockGuestUser, "char-123", "Hello");

        expect(result.userMessage.content).toBe("Hello");
        expect(result.aiMessage.content).toBe(aiResponse);
        expect(result.usageCount).toBe(1);
        expect(result.maxUsage).toBe(3);
        expect(mockGuestChatRepository.addCharacterAtomic).toHaveBeenCalledWith(
          "guest-123",
          "char-123",
          GUEST_MAX_CHARACTERS,
        );
      });

      it("Lua 스크립트에서 not_found 반환 시 UnauthorizedException을 던져야 합니다", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("exists");
        mockGuestChatRepository.getRecentMessages.mockResolvedValue([]);
        mockAuthService.getGuestInfo.mockResolvedValue({ usageCount: 0, maxUsage: 3 });
        mockAiService.generateChatResponse.mockResolvedValue(aiResponse);
        mockGuestChatRepository.saveMessagesAtomic.mockResolvedValue({
          success: false,
          reason: "not_found",
        });

        await expect(service.sendMessage(mockGuestUser, "char-123", "Hello")).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it("Lua 스크립트에서 limit_exceeded 반환 시 ForbiddenException을 던져야 합니다 (TOCTOU 방지)", async () => {
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockGuestChatRepository.addCharacterAtomic.mockResolvedValue("exists");
        mockGuestChatRepository.getRecentMessages.mockResolvedValue([]);
        mockAuthService.getGuestInfo.mockResolvedValue({ usageCount: 2, maxUsage: 3 });
        mockAiService.generateChatResponse.mockResolvedValue(aiResponse);
        mockGuestChatRepository.saveMessagesAtomic.mockResolvedValue({
          success: false,
          reason: "limit_exceeded",
        });

        await expect(service.sendMessage(mockGuestUser, "char-123", "Hello")).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe("일반 유저 메시지", () => {
      it("채팅방이 없으면 NotFoundException을 던져야 합니다", async () => {
        mockChatRepository.findChatRoomByUserId.mockResolvedValue(null);

        await expect(service.sendMessage(mockRegularUser, "char-123", "Hello")).rejects.toThrow(
          NotFoundException,
        );
      });

      it("채팅방에 캐릭터가 없으면 NotFoundException을 던져야 합니다", async () => {
        mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
        mockChatRepository.findChatRoomCharacterId.mockResolvedValue(null);

        await expect(service.sendMessage(mockRegularUser, "char-123", "Hello")).rejects.toThrow(
          NotFoundException,
        );
      });

      it("캐릭터가 존재하지 않으면 NotFoundException을 던져야 합니다", async () => {
        mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
        mockChatRepository.findChatRoomCharacterId.mockResolvedValue("crc-123");
        mockChatRepository.findCharacterById.mockResolvedValue(null);

        await expect(service.sendMessage(mockRegularUser, "char-123", "Hello")).rejects.toThrow(
          NotFoundException,
        );
      });

      it("일반 유저가 메시지를 보낼 수 있어야 합니다", async () => {
        mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
        mockChatRepository.findChatRoomCharacterId.mockResolvedValue("crc-123");
        mockChatRepository.findCharacterById.mockResolvedValue(mockCharacter);
        mockChatRepository.findRecentMessages.mockResolvedValue([]);
        mockAiService.generateChatResponse.mockResolvedValue(aiResponse);
        mockChatRepository.createMessagesInTransaction.mockResolvedValue({
          userMessage: { id: "msg-1", content: "Hello", role: "user" },
          aiMessage: { id: "msg-2", content: aiResponse, role: "assistant" },
        });

        const result = await service.sendMessage(mockRegularUser, "char-123", "Hello");

        expect(result.userMessage.content).toBe("Hello");
        expect(result.aiMessage.content).toBe(aiResponse);
        expect(mockAiService.generateChatResponse).toHaveBeenCalled();
      });
    });
  });

  describe("resetMessages", () => {
    it("게스트가 없는 캐릭터의 대화를 초기화하면 NotFoundException을 던져야 합니다", async () => {
      mockGuestChatRepository.hasCharacter.mockResolvedValue(false);

      await expect(service.resetMessages(mockGuestUser, "char-123")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("게스트가 대화를 초기화할 수 있어야 합니다", async () => {
      mockGuestChatRepository.hasCharacter.mockResolvedValue(true);

      await service.resetMessages(mockGuestUser, "char-123");

      expect(mockGuestChatRepository.deleteMessages).toHaveBeenCalledWith("guest-123", "char-123");
    });

    it("채팅방이 없는 일반 유저가 초기화하면 NotFoundException을 던져야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(null);

      await expect(service.resetMessages(mockRegularUser, "char-123")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("채팅방에 없는 캐릭터의 대화를 초기화하면 NotFoundException을 던져야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
      mockChatRepository.findChatRoomCharacter.mockResolvedValue(null);

      await expect(service.resetMessages(mockRegularUser, "char-123")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("일반 유저가 대화를 초기화할 수 있어야 합니다", async () => {
      mockChatRepository.findChatRoomByUserId.mockResolvedValue(mockChatRoom);
      mockChatRepository.findChatRoomCharacter.mockResolvedValue({ id: "crc-123" });

      await service.resetMessages(mockRegularUser, "char-123");

      expect(mockChatRepository.deleteMessages).toHaveBeenCalledWith("chatroom-123", "char-123");
    });
  });
});
