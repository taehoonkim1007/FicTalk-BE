import { Injectable, NotFoundException } from "@nestjs/common";

import { AiService } from "../ai/ai.service";
import {
  ChatCharacterResponse,
  ChatCharactersResponse,
  ChatMessagesResponse,
  ChatRoomResponse,
  SendMessageResponse,
} from "./dto";
import { ChatRepository } from "./repositories/chat.repository";

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly aiService: AiService,
  ) {}

  /**
   * 채팅방 조회/생성
   */
  async getOrCreateChatRoom(userId: string): Promise<ChatRoomResponse> {
    return this.chatRepository.findOrCreateChatRoom(userId);
  }

  /**
   * 채팅방 캐릭터 목록 조회
   */
  async getChatCharacters(userId: string): Promise<ChatCharactersResponse> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(userId);

    if (!chatRoom) {
      return { characters: [] };
    }

    const characters = await this.chatRepository.findChatCharacters(chatRoom.id);
    return { characters };
  }

  /**
   * 캐릭터 추가 (이미 존재하면 해당 캐릭터 반환)
   */
  async addCharacter(userId: string, characterId: string): Promise<ChatCharacterResponse> {
    // 캐릭터 존재 확인
    const character = await this.chatRepository.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundException("캐릭터를 찾을 수 없습니다.");
    }

    // 채팅방 조회/생성
    const chatRoom = await this.chatRepository.findOrCreateChatRoom(userId);

    // 이미 추가되어 있는지 확인 - 있으면 기존 캐릭터 반환
    const existing = await this.chatRepository.findChatRoomCharacter(chatRoom.id, characterId);
    if (existing) {
      // 이미 추가된 캐릭터 정보 반환
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

    // 캐릭터 추가
    return this.chatRepository.addCharacter(chatRoom.id, characterId);
  }

  /**
   * 캐릭터 제거
   */
  async removeCharacter(userId: string, characterId: string): Promise<void> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(userId);

    if (!chatRoom) {
      throw new NotFoundException("채팅방을 찾을 수 없습니다.");
    }

    const existing = await this.chatRepository.findChatRoomCharacter(chatRoom.id, characterId);
    if (!existing) {
      throw new NotFoundException("해당 캐릭터와의 대화를 찾을 수 없습니다.");
    }

    await this.chatRepository.removeCharacter(chatRoom.id, characterId);
  }

  /**
   * 메시지 목록 조회
   */
  async getMessages(
    userId: string,
    characterId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<ChatMessagesResponse> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(userId);

    if (!chatRoom) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    return this.chatRepository.findMessages(chatRoom.id, characterId, cursor, limit);
  }

  /**
   * 메시지 전송 + AI 응답 생성
   */
  async sendMessage(
    userId: string,
    characterId: string,
    content: string,
  ): Promise<SendMessageResponse> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(userId);

    if (!chatRoom) {
      throw new NotFoundException("채팅방을 찾을 수 없습니다.");
    }

    const chatRoomCharacterId = await this.chatRepository.findChatRoomCharacterId(
      chatRoom.id,
      characterId,
    );

    if (!chatRoomCharacterId) {
      throw new NotFoundException("해당 캐릭터와의 대화를 찾을 수 없습니다.");
    }

    // 캐릭터 정보 조회
    const character = await this.chatRepository.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundException("캐릭터를 찾을 수 없습니다.");
    }

    // 최근 대화 내역 조회 (사용자 메시지 저장 전에 조회해야 중복 방지)
    const recentMessages = await this.chatRepository.findRecentMessages(chatRoomCharacterId, 20);

    // 사용자 메시지 저장
    const userMessage = await this.chatRepository.createMessage(
      chatRoomCharacterId,
      "user",
      content,
    );

    // AI 응답 생성
    const aiResponse = await this.aiService.generateChatResponse({
      characterName: character.name,
      characterRole: character.role,
      characterPersonality: character.personality || "",
      storyTitle: character.story.title,
      storySummary: character.story.summary,
      messages: recentMessages,
      userMessage: content,
    });

    // AI 응답 메시지 저장
    const aiMessage = await this.chatRepository.createMessage(
      chatRoomCharacterId,
      "assistant",
      aiResponse,
    );

    return {
      userMessage,
      aiMessage,
    };
  }

  /**
   * 대화 초기화
   */
  async resetMessages(userId: string, characterId: string): Promise<void> {
    const chatRoom = await this.chatRepository.findChatRoomByUserId(userId);

    if (!chatRoom) {
      throw new NotFoundException("채팅방을 찾을 수 없습니다.");
    }

    const existing = await this.chatRepository.findChatRoomCharacter(chatRoom.id, characterId);
    if (!existing) {
      throw new NotFoundException("해당 캐릭터와의 대화를 찾을 수 없습니다.");
    }

    await this.chatRepository.deleteMessages(chatRoom.id, characterId);
  }
}
