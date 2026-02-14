import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { AiService } from "../ai/ai.service";
import { AuthService } from "../auth/auth.service";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ERROR_CODES } from "../common/constants/error-codes";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import {
  DEFAULT_MESSAGE_LIMIT,
  GUEST_MAX_CHARACTERS,
  RECENT_MESSAGES_FOR_AI,
} from "./constants/chat.constants";
import {
  ChatCharacterResponse,
  ChatCharactersResponse,
  ChatMessagesResponse,
  ChatRoomResponse,
  SendMessageResponse,
} from "./dto";
import { ChatRepository } from "./repositories/chat.repository";
import { GuestChatRepository } from "./repositories/guest-chat.repository";

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly guestChatRepository: GuestChatRepository,
    private readonly aiService: AiService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 채팅방 조회/생성 (일반 유저만)
   */
  async getOrCreateChatRoom(userId: string): Promise<ChatRoomResponse> {
    return this.chatRepository.findOrCreateChatRoom(userId);
  }

  /**
   * 채팅방 캐릭터 목록 조회
   */
  async getChatCharacters(user: AuthenticatedUser): Promise<ChatCharactersResponse> {
    if (user.role === "guest") {
      return this.getGuestChatCharacters(user.id);
    }
    return this.getUserChatCharacters(user.id);
  }

  private async getUserChatCharacters(userId: string): Promise<ChatCharactersResponse> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(userId);

    if (!chatRoom) {
      return { characters: [] };
    }

    const characters = await this.chatRepository.findChatCharacters(chatRoom.id);
    return { characters };
  }

  private async getGuestChatCharacters(guestId: string): Promise<ChatCharactersResponse> {
    const characterIds = await this.guestChatRepository.getCharacterIds(guestId);

    if (characterIds.length === 0) {
      return { characters: [] };
    }

    const charactersData = await this.chatRepository.findCharactersByIds(characterIds);

    const characters: ChatCharacterResponse[] = charactersData.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      description: character.description,
      profileImage: character.profileImage,
      backgroundImage: character.backgroundImage,
      imageColor: character.imageColor,
      personality: character.personality,
      firstMessage: character.firstMessage,
      voiceId: character.voiceId,
      voiceSettings: character.voiceSettings as {
        stability: number;
        similarityBoost: number;
        style: number;
        speed: number;
      } | null,
      story: {
        id: character.story.id,
        title: character.story.title,
        backgroundImage: character.story.backgroundImage,
      },
    }));

    return { characters };
  }

  /**
   * 캐릭터 추가 (이미 존재하면 해당 캐릭터 반환)
   */
  async addCharacter(user: AuthenticatedUser, characterId: string): Promise<ChatCharacterResponse> {
    // 캐릭터 존재 확인
    const character = await this.chatRepository.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND);
    }

    if (user.role === "guest") {
      // 원자적으로 캐릭터 추가 (Race Condition 방지)
      const result = await this.guestChatRepository.addCharacterAtomic(
        user.id,
        characterId,
        GUEST_MAX_CHARACTERS,
      );
      if (result === "limit") {
        throw new ForbiddenException(ERROR_CODES.GUEST_CHARACTER_LIMIT);
      }
      // "added" 또는 "exists"면 정상 진행
    } else {
      // 채팅방 조회/생성
      const chatRoom = await this.chatRepository.findOrCreateChatRoom(user.id);
      await this.chatRepository.addCharacter(chatRoom.id, characterId);
    }

    return {
      id: character.id,
      name: character.name,
      role: character.role,
      description: character.description,
      profileImage: character.profileImage,
      backgroundImage: character.backgroundImage,
      imageColor: character.imageColor,
      personality: character.personality,
      firstMessage: character.firstMessage,
      voiceId: character.voiceId,
      voiceSettings: character.voiceSettings as {
        stability: number;
        similarityBoost: number;
        style: number;
        speed: number;
      } | null,
      story: {
        id: character.story.id,
        title: character.story.title,
        backgroundImage: character.story.backgroundImage,
      },
    };
  }

  /**
   * 캐릭터 제거
   */
  async removeCharacter(user: AuthenticatedUser, characterId: string): Promise<void> {
    if (user.role === "guest") {
      const hasCharacter = await this.guestChatRepository.hasCharacter(user.id, characterId);
      if (!hasCharacter) {
        throw new NotFoundException(ERROR_MESSAGES.CHAT_CHARACTER_NOT_FOUND);
      }
      await this.guestChatRepository.removeCharacter(user.id, characterId);
      return;
    }

    const chatRoom = await this.chatRepository.findChatRoomByUserId(user.id);
    if (!chatRoom) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_ROOM_NOT_FOUND);
    }

    const existing = await this.chatRepository.findChatRoomCharacter(chatRoom.id, characterId);
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_CHARACTER_NOT_FOUND);
    }

    await this.chatRepository.removeCharacter(chatRoom.id, characterId);
  }

  /**
   * 메시지 목록 조회
   */
  async getMessages(
    user: AuthenticatedUser,
    characterId: string,
    cursor?: string,
    limit: number = DEFAULT_MESSAGE_LIMIT,
  ): Promise<ChatMessagesResponse> {
    if (user.role === "guest") {
      return this.guestChatRepository.getMessages(user.id, characterId, limit);
    }

    const chatRoom = await this.chatRepository.findChatRoomByUserId(user.id);
    if (!chatRoom) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    return this.chatRepository.findMessages(chatRoom.id, characterId, cursor, limit);
  }

  /**
   * 메시지 전송 + AI 응답 생성
   */
  async sendMessage(
    user: AuthenticatedUser,
    characterId: string,
    content: string,
  ): Promise<SendMessageResponse> {
    if (user.role === "guest") {
      return this.sendGuestMessage(user, characterId, content);
    }
    return this.sendUserMessage(user, characterId, content);
  }

  private async sendGuestMessage(
    user: AuthenticatedUser,
    characterId: string,
    content: string,
  ): Promise<SendMessageResponse> {
    // 캐릭터 정보 조회
    const character = await this.chatRepository.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND);
    }

    // 원자적으로 캐릭터 추가 (이미 있으면 무시, Race Condition 방지)
    const addResult = await this.guestChatRepository.addCharacterAtomic(
      user.id,
      characterId,
      GUEST_MAX_CHARACTERS,
    );
    if (addResult === "limit") {
      throw new ForbiddenException(ERROR_CODES.GUEST_CHARACTER_LIMIT);
    }

    // 최근 대화 내역 조회
    const recentMessages = await this.guestChatRepository.getRecentMessages(
      user.id,
      characterId,
      RECENT_MESSAGES_FOR_AI,
    );

    // AI 응답 생성 (RAG 적용) - 먼저 응답을 받은 후 저장
    const aiResponse = await this.aiService.generateChatResponse({
      characterName: character.name,
      characterRole: character.role,
      characterPersonality: character.personality || "",
      storyId: character.story.id,
      storyTitle: character.story.title,
      storySummary: character.story.summary,
      messages: recentMessages,
      userMessage: content,
    });

    // AI 응답 성공 후 사용자 메시지와 AI 응답을 함께 저장 (원자적)
    const { userMessage, aiMessage } = await this.guestChatRepository.saveMessagesAtomic(
      user.id,
      characterId,
      content,
      aiResponse,
    );

    // 게스트 사용량 증가
    const usage = await this.authService.incrementGuestUsage(user.id);

    return {
      userMessage,
      aiMessage,
      usageCount: usage.usageCount,
      maxUsage: usage.maxUsage,
    };
  }

  private async sendUserMessage(
    user: AuthenticatedUser,
    characterId: string,
    content: string,
  ): Promise<SendMessageResponse> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(user.id);

    if (!chatRoom) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_ROOM_NOT_FOUND);
    }

    const chatRoomCharacterId = await this.chatRepository.findChatRoomCharacterId(
      chatRoom.id,
      characterId,
    );

    if (!chatRoomCharacterId) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_CHARACTER_NOT_FOUND);
    }

    // 캐릭터 정보 조회
    const character = await this.chatRepository.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND);
    }

    // 최근 대화 내역 조회
    const recentMessages = await this.chatRepository.findRecentMessages(
      chatRoomCharacterId,
      RECENT_MESSAGES_FOR_AI,
    );

    // AI 응답 생성 (RAG 적용) - 먼저 응답을 받은 후 저장
    const aiResponse = await this.aiService.generateChatResponse({
      characterName: character.name,
      characterRole: character.role,
      characterPersonality: character.personality || "",
      storyId: character.story.id,
      storyTitle: character.story.title,
      storySummary: character.story.summary,
      messages: recentMessages,
      userMessage: content,
    });

    // AI 응답 성공 후 사용자 메시지와 AI 응답을 트랜잭션으로 저장
    const { userMessage, aiMessage } = await this.chatRepository.createMessagesInTransaction(
      chatRoomCharacterId,
      content,
      aiResponse,
    );

    return { userMessage, aiMessage };
  }

  /**
   * 대화 초기화
   */
  async resetMessages(user: AuthenticatedUser, characterId: string): Promise<void> {
    if (user.role === "guest") {
      const hasCharacter = await this.guestChatRepository.hasCharacter(user.id, characterId);
      if (!hasCharacter) {
        throw new NotFoundException(ERROR_MESSAGES.CHAT_CHARACTER_NOT_FOUND);
      }
      await this.guestChatRepository.deleteMessages(user.id, characterId);
      return;
    }

    const chatRoom = await this.chatRepository.findChatRoomByUserId(user.id);
    if (!chatRoom) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_ROOM_NOT_FOUND);
    }

    const existing = await this.chatRepository.findChatRoomCharacter(chatRoom.id, characterId);
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_CHARACTER_NOT_FOUND);
    }

    await this.chatRepository.deleteMessages(chatRoom.id, characterId);
  }
}
