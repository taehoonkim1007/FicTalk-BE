import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { ChatCharacterResponse, ChatMessageResponse, ChatRoomResponse } from "../dto";

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 채팅방 조회 또는 생성
   */
  async findOrCreateChatRoom(userId: string): Promise<ChatRoomResponse> {
    const chatRoom = await this.prisma.chatRoom.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return {
      id: chatRoom.id,
      createdAt: chatRoom.createdAt,
    };
  }

  /**
   * 사용자의 채팅방 조회
   */
  async findChatRoomByUserId(userId: string) {
    return this.prisma.chatRoom.findUnique({
      where: { userId },
    });
  }

  /**
   * 채팅방의 캐릭터 목록 조회
   */
  async findChatCharacters(chatRoomId: string): Promise<ChatCharacterResponse[]> {
    const chatRoomCharacters = await this.prisma.chatRoomCharacter.findMany({
      where: { chatRoomId },
      include: {
        character: {
          include: {
            story: {
              select: {
                id: true,
                title: true,
                backgroundImage: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    return chatRoomCharacters.map((crc) => ({
      id: crc.character.id,
      name: crc.character.name,
      role: crc.character.role,
      description: crc.character.description,
      profileImage: crc.character.profileImage,
      backgroundImage: crc.character.backgroundImage,
      imageColor: crc.character.imageColor,
      personality: crc.character.personality,
      firstMessage: crc.character.firstMessage,
      voiceId: crc.character.voiceId,
      voiceSettings: crc.character.voiceSettings as {
        stability: number;
        similarityBoost: number;
        style: number;
        speed: number;
      } | null,
      story: crc.character.story,
    }));
  }

  /**
   * 캐릭터 추가 (이미 존재하면 기존 데이터 반환)
   * Race Condition 방지를 위한 재시도 로직 포함
   */
  async addCharacter(
    chatRoomId: string,
    characterId: string,
    maxRetries: number = 3,
  ): Promise<ChatCharacterResponse> {
    const includeOptions = {
      character: {
        include: {
          story: {
            select: {
              id: true,
              title: true,
              backgroundImage: true,
            },
          },
        },
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const chatRoomCharacter = await this.prisma.chatRoomCharacter.upsert({
          where: {
            chatRoomId_characterId: {
              chatRoomId,
              characterId,
            },
          },
          create: {
            chatRoomId,
            characterId,
          },
          update: {}, // 이미 존재하면 아무것도 업데이트하지 않음
          include: includeOptions,
        });

        return this.mapChatRoomCharacterToResponse(chatRoomCharacter);
      } catch (error) {
        // Race condition으로 인한 unique constraint 오류 처리
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          lastError = error;

          // 기존 레코드 조회 시도
          const existing = await this.prisma.chatRoomCharacter.findUnique({
            where: {
              chatRoomId_characterId: {
                chatRoomId,
                characterId,
              },
            },
            include: includeOptions,
          });

          if (existing) {
            return this.mapChatRoomCharacterToResponse(existing);
          }

          // 레코드가 없으면 다음 시도 전 짧은 대기 (exponential backoff)
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 10));
            continue;
          }
        }
        throw error;
      }
    }

    throw lastError ?? new Error("Failed to add character after retries");
  }

  /**
   * ChatRoomCharacter를 응답 DTO로 매핑
   */
  private mapChatRoomCharacterToResponse(chatRoomCharacter: {
    character: {
      id: string;
      name: string;
      role: string;
      description: string;
      profileImage: string | null;
      backgroundImage: string | null;
      imageColor: string;
      personality: string | null;
      firstMessage: string | null;
      voiceId: string | null;
      voiceSettings: unknown;
      story: { id: string; title: string; backgroundImage: string | null };
    };
  }): ChatCharacterResponse {
    return {
      id: chatRoomCharacter.character.id,
      name: chatRoomCharacter.character.name,
      role: chatRoomCharacter.character.role,
      description: chatRoomCharacter.character.description,
      profileImage: chatRoomCharacter.character.profileImage,
      backgroundImage: chatRoomCharacter.character.backgroundImage,
      imageColor: chatRoomCharacter.character.imageColor,
      personality: chatRoomCharacter.character.personality,
      firstMessage: chatRoomCharacter.character.firstMessage,
      voiceId: chatRoomCharacter.character.voiceId,
      voiceSettings: chatRoomCharacter.character.voiceSettings as {
        stability: number;
        similarityBoost: number;
        style: number;
        speed: number;
      } | null,
      story: chatRoomCharacter.character.story,
    };
  }

  /**
   * 캐릭터가 이미 추가되어 있는지 확인
   */
  async findChatRoomCharacter(chatRoomId: string, characterId: string) {
    return this.prisma.chatRoomCharacter.findUnique({
      where: {
        chatRoomId_characterId: {
          chatRoomId,
          characterId,
        },
      },
    });
  }

  /**
   * 캐릭터 제거
   */
  async removeCharacter(chatRoomId: string, characterId: string): Promise<void> {
    await this.prisma.chatRoomCharacter.delete({
      where: {
        chatRoomId_characterId: {
          chatRoomId,
          characterId,
        },
      },
    });
  }

  /**
   * 캐릭터 존재 여부 확인
   */
  async findCharacterById(characterId: string) {
    return this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            summary: true,
            backgroundImage: true,
          },
        },
      },
    });
  }

  /**
   * 여러 캐릭터 조회 (N+1 문제 해결)
   */
  async findCharactersByIds(characterIds: string[]) {
    return this.prisma.character.findMany({
      where: { id: { in: characterIds } },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            summary: true,
            backgroundImage: true,
          },
        },
      },
    });
  }

  /**
   * 메시지 목록 조회 (커서 기반 페이지네이션)
   */
  async findMessages(
    chatRoomId: string,
    characterId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<{
    messages: ChatMessageResponse[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    // 먼저 ChatRoomCharacter ID를 찾습니다
    const chatRoomCharacter = await this.prisma.chatRoomCharacter.findUnique({
      where: {
        chatRoomId_characterId: {
          chatRoomId,
          characterId,
        },
      },
    });

    if (!chatRoomCharacter) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        chatRoomCharacterId: chatRoomCharacter.id,
        ...(cursor && {
          createdAt: {
            lt: new Date(
              (await this.prisma.chatMessage.findUnique({ where: { id: cursor } }))?.createdAt ||
                new Date(),
            ),
          },
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: resultMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      nextCursor: hasMore ? resultMessages[resultMessages.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * 메시지 생성
   */
  async createMessage(
    chatRoomCharacterId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<ChatMessageResponse> {
    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomCharacterId,
        role,
        content,
      },
    });

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  /**
   * ChatRoomCharacter ID 조회
   */
  async findChatRoomCharacterId(chatRoomId: string, characterId: string): Promise<string | null> {
    const chatRoomCharacter = await this.prisma.chatRoomCharacter.findUnique({
      where: {
        chatRoomId_characterId: {
          chatRoomId,
          characterId,
        },
      },
    });

    return chatRoomCharacter?.id || null;
  }

  /**
   * 최근 메시지 조회 (AI 컨텍스트용)
   */
  async findRecentMessages(
    chatRoomCharacterId: string,
    limit: number = 20,
  ): Promise<{ role: string; content: string }[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { chatRoomCharacterId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { role: true, content: true },
    });

    return messages.reverse();
  }

  /**
   * 대화 초기화 (메시지 전체 삭제)
   */
  async deleteMessages(chatRoomId: string, characterId: string): Promise<void> {
    const chatRoomCharacter = await this.prisma.chatRoomCharacter.findUnique({
      where: {
        chatRoomId_characterId: {
          chatRoomId,
          characterId,
        },
      },
    });

    if (chatRoomCharacter) {
      await this.prisma.chatMessage.deleteMany({
        where: { chatRoomCharacterId: chatRoomCharacter.id },
      });
    }
  }

  /**
   * 사용자 메시지와 AI 응답을 트랜잭션으로 함께 저장
   * AI 응답 생성 실패 시 사용자 메시지도 저장되지 않음
   */
  async createMessagesInTransaction(
    chatRoomCharacterId: string,
    userContent: string,
    aiContent: string,
  ): Promise<{ userMessage: ChatMessageResponse; aiMessage: ChatMessageResponse }> {
    const [userMessage, aiMessage] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.chatMessage.create({
        data: {
          chatRoomCharacterId,
          role: "user",
          content: userContent,
        },
      });

      const ai = await tx.chatMessage.create({
        data: {
          chatRoomCharacterId,
          role: "assistant",
          content: aiContent,
        },
      });

      return [user, ai];
    });

    return {
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      aiMessage: {
        id: aiMessage.id,
        role: aiMessage.role,
        content: aiMessage.content,
        createdAt: aiMessage.createdAt,
      },
    };
  }
}
