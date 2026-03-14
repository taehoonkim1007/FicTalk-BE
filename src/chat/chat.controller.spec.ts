import { Test, type TestingModule } from "@nestjs/testing";

import type { AuthenticatedGuest, AuthenticatedRegularUser } from "../auth/types/auth.types";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

describe("ChatController", () => {
  let controller: ChatController;

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

  const mockChatRoom = { id: "chatroom-123", userId: "user-123" };

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
    voiceSettings: null,
    story: { id: "story-123", title: "Test Story", backgroundImage: "story-bg.jpg" },
  };

  const mockChatService = {
    getOrCreateChatRoom: jest.fn(),
    getChatCharacters: jest.fn(),
    addCharacter: jest.fn(),
    removeCharacter: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    resetMessages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("컨트롤러가 정의되어 있어야 합니다", () => {
    expect(controller).toBeDefined();
  });

  describe("getOrCreateChatRoom", () => {
    it("채팅방을 조회하거나 생성해야 합니다", async () => {
      mockChatService.getOrCreateChatRoom.mockResolvedValue(mockChatRoom);

      const result = await controller.getOrCreateChatRoom("user-123");

      expect(result).toEqual(mockChatRoom);
      expect(mockChatService.getOrCreateChatRoom).toHaveBeenCalledWith("user-123");
    });
  });

  describe("getChatCharacters", () => {
    it("캐릭터 목록을 반환해야 합니다", async () => {
      const mockResponse = { characters: [mockCharacter] };
      mockChatService.getChatCharacters.mockResolvedValue(mockResponse);

      const result = await controller.getChatCharacters(mockRegularUser);

      expect(result).toEqual(mockResponse);
      expect(mockChatService.getChatCharacters).toHaveBeenCalledWith(mockRegularUser);
    });
  });

  describe("addCharacter", () => {
    it("캐릭터를 추가해야 합니다", async () => {
      mockChatService.addCharacter.mockResolvedValue(mockCharacter);

      const result = await controller.addCharacter(mockRegularUser, { characterId: "char-123" });

      expect(result).toEqual(mockCharacter);
      expect(mockChatService.addCharacter).toHaveBeenCalledWith(mockRegularUser, "char-123");
    });
  });

  describe("removeCharacter", () => {
    it("캐릭터를 제거해야 합니다", async () => {
      mockChatService.removeCharacter.mockResolvedValue(undefined);

      const result = await controller.removeCharacter(mockRegularUser, "char-123");

      expect(result).toEqual({ message: "캐릭터가 제거되었습니다." });
      expect(mockChatService.removeCharacter).toHaveBeenCalledWith(mockRegularUser, "char-123");
    });
  });

  describe("getMessages", () => {
    it("메시지 목록을 반환해야 합니다", async () => {
      const mockResponse = { messages: [], nextCursor: null, hasMore: false };
      mockChatService.getMessages.mockResolvedValue(mockResponse);

      const result = await controller.getMessages(mockRegularUser, "char-123", {
        cursor: "cursor-123",
        limit: 20,
      });

      expect(result).toEqual(mockResponse);
      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        mockRegularUser,
        "char-123",
        "cursor-123",
        20,
      );
    });

    it("기본 파라미터로 메시지를 조회해야 합니다", async () => {
      const mockResponse = { messages: [], nextCursor: null, hasMore: false };
      mockChatService.getMessages.mockResolvedValue(mockResponse);

      const result = await controller.getMessages(mockRegularUser, "char-123", {});

      expect(result).toEqual(mockResponse);
      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        mockRegularUser,
        "char-123",
        undefined,
        undefined,
      );
    });
  });

  describe("sendMessage", () => {
    it("메시지를 전송하고 AI 응답을 반환해야 합니다", async () => {
      const mockResponse = {
        userMessage: { id: "msg-1", content: "Hello", role: "user" },
        aiMessage: { id: "msg-2", content: "Hi there!", role: "assistant" },
      };
      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      const result = await controller.sendMessage(mockGuestUser, "char-123", { content: "Hello" });

      expect(result).toEqual(mockResponse);
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(mockGuestUser, "char-123", "Hello");
    });
  });

  describe("resetMessages", () => {
    it("대화를 초기화해야 합니다", async () => {
      mockChatService.resetMessages.mockResolvedValue(undefined);

      const result = await controller.resetMessages(mockRegularUser, "char-123");

      expect(result).toEqual({ message: "대화가 초기화되었습니다." });
      expect(mockChatService.resetMessages).toHaveBeenCalledWith(mockRegularUser, "char-123");
    });
  });
});
