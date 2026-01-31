import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ChatService } from "./chat.service";
import {
  AddCharacterDto,
  ChatCharacterResponse,
  ChatCharactersResponse,
  ChatMessagesResponse,
  ChatRoomResponse,
  GetMessagesDto,
  SendMessageDto,
  SendMessageResponse,
} from "./dto";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * 채팅방 조회/생성
   */
  @Get()
  async getOrCreateChatRoom(@CurrentUser("id") userId: string): Promise<ChatRoomResponse> {
    return this.chatService.getOrCreateChatRoom(userId);
  }

  /**
   * 채팅방 캐릭터 목록 조회
   */
  @Get("characters")
  async getChatCharacters(@CurrentUser("id") userId: string): Promise<ChatCharactersResponse> {
    return this.chatService.getChatCharacters(userId);
  }

  /**
   * 캐릭터 추가
   */
  @Post("characters")
  async addCharacter(
    @CurrentUser("id") userId: string,
    @Body() dto: AddCharacterDto,
  ): Promise<ChatCharacterResponse> {
    return this.chatService.addCharacter(userId, dto.characterId);
  }

  /**
   * 캐릭터 제거
   */
  @Delete("characters/:characterId")
  async removeCharacter(
    @CurrentUser("id") userId: string,
    @Param("characterId") characterId: string,
  ): Promise<{ message: string }> {
    await this.chatService.removeCharacter(userId, characterId);
    return { message: "캐릭터가 제거되었습니다." };
  }

  /**
   * 메시지 목록 조회
   */
  @Get("characters/:characterId/messages")
  async getMessages(
    @CurrentUser("id") userId: string,
    @Param("characterId") characterId: string,
    @Query() dto: GetMessagesDto,
  ): Promise<ChatMessagesResponse> {
    return this.chatService.getMessages(userId, characterId, dto.cursor, dto.limit);
  }

  /**
   * 메시지 전송 + AI 응답
   */
  @Post("characters/:characterId/messages")
  async sendMessage(
    @CurrentUser("id") userId: string,
    @Param("characterId") characterId: string,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResponse> {
    return this.chatService.sendMessage(userId, characterId, dto.content);
  }

  /**
   * 대화 초기화
   */
  @Delete("characters/:characterId/messages")
  async resetMessages(
    @CurrentUser("id") userId: string,
    @Param("characterId") characterId: string,
  ): Promise<{ message: string }> {
    await this.chatService.resetMessages(userId, characterId);
    return { message: "대화가 초기화되었습니다." };
  }
}
