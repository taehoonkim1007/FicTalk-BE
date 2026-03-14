import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";

import { GuestUsageGuard } from "../auth/guards/guest-usage.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
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
   * 채팅방 조회/생성 (일반 유저만)
   */
  @Get()
  async getOrCreateChatRoom(@CurrentUser("id") userId: string): Promise<ChatRoomResponse> {
    return this.chatService.getOrCreateChatRoom(userId);
  }

  /**
   * 채팅방 캐릭터 목록 조회
   */
  @Get("characters")
  async getChatCharacters(@CurrentUser() user: AuthenticatedUser): Promise<ChatCharactersResponse> {
    return this.chatService.getChatCharacters(user);
  }

  /**
   * 캐릭터 추가
   */
  @Post("characters")
  async addCharacter(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCharacterDto,
  ): Promise<ChatCharacterResponse> {
    return this.chatService.addCharacter(user, dto.characterId);
  }

  /**
   * 캐릭터 제거
   */
  @Delete("characters/:characterId")
  async removeCharacter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("characterId") characterId: string,
  ): Promise<{ message: string }> {
    await this.chatService.removeCharacter(user, characterId);
    return { message: "캐릭터가 제거되었습니다." };
  }

  /**
   * 메시지 목록 조회
   */
  @Get("characters/:characterId/messages")
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("characterId") characterId: string,
    @Query() dto: GetMessagesDto,
  ): Promise<ChatMessagesResponse> {
    return this.chatService.getMessages(user, characterId, dto.cursor, dto.limit);
  }

  /**
   * 메시지 전송 + AI 응답
   */
  @Post("characters/:characterId/messages")
  @UseGuards(GuestUsageGuard)
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("characterId") characterId: string,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResponse> {
    return this.chatService.sendMessage(user, characterId, dto.content);
  }

  /**
   * 대화 초기화
   */
  @Delete("characters/:characterId/messages")
  async resetMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("characterId") characterId: string,
  ): Promise<{ message: string }> {
    await this.chatService.resetMessages(user, characterId);
    return { message: "대화가 초기화되었습니다." };
  }
}
