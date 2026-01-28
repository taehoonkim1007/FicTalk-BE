import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { type CharacterDetailResponse } from "../../stories/dto/story-response.dto";
import { type CharacterWithStoryResponse } from "../dto/character-response.dto";
import { type CreateCharacterDto } from "../dto/create-character.dto";
import { type GetCharactersDto } from "../dto/get-characters.dto";
import { type UpdateCharacterDto } from "../dto/update-character.dto";

export interface CharacterWithStory {
  id: string;
  storyId: string;
  story: {
    creatorId: string | null;
  };
}

@Injectable()
export class CharactersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithStory(id: string): Promise<CharacterWithStory | null> {
    return this.prisma.character.findUnique({
      where: { id },
      select: {
        id: true,
        storyId: true,
        story: {
          select: {
            creatorId: true,
          },
        },
      },
    });
  }

  async findByIdWithDetails(id: string): Promise<CharacterWithStoryResponse | null> {
    const character = await this.prisma.character.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        description: true,
        personality: true,
        firstMessage: true,
        imageColor: true,
        profileImage: true,
        backgroundImage: true,
        backgroundColor: true,
        createdAt: true,
        story: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverColor: true,
            coverImage: true,
          },
        },
      },
    });

    return character;
  }

  async findMany(
    dto: GetCharactersDto,
  ): Promise<{ characters: CharacterWithStoryResponse[]; total: number }> {
    const where: Prisma.CharacterWhereInput = {};

    if (dto.category) {
      where.story = { category: { slug: dto.category } };
    }

    if (dto.search) {
      where.name = { contains: dto.search, mode: "insensitive" };
    }

    const [characters, total] = await Promise.all([
      this.prisma.character.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: [{ story: { isOfficial: "desc" } }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          role: true,
          description: true,
          imageColor: true,
          profileImage: true,
          backgroundImage: true,
          backgroundColor: true,
          story: {
            select: {
              id: true,
              title: true,
              authorName: true,
              coverColor: true,
              coverImage: true,
            },
          },
        },
      }),
      this.prisma.character.count({ where }),
    ]);

    return {
      characters,
      total,
    };
  }

  async create(storyId: string, dto: CreateCharacterDto): Promise<CharacterDetailResponse> {
    const character = await this.prisma.character.create({
      data: {
        id: dto.id,
        storyId,
        name: dto.name,
        role: dto.role,
        description: dto.description,
        personality: dto.personality,
        firstMessage: dto.firstMessage,
        imageColor: dto.imageColor ?? "bg-stone-400",
        profileImage: dto.profileImage,
        backgroundImage: dto.backgroundImage,
        backgroundColor: dto.backgroundColor ?? "bg-stone-900",
      },
      select: {
        id: true,
        name: true,
        role: true,
        description: true,
        personality: true,
        firstMessage: true,
        imageColor: true,
        profileImage: true,
        backgroundImage: true,
        backgroundColor: true,
        createdAt: true,
      },
    });

    return character;
  }

  async update(id: string, dto: UpdateCharacterDto): Promise<CharacterDetailResponse> {
    const character = await this.prisma.character.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        description: dto.description,
        personality: dto.personality,
        firstMessage: dto.firstMessage,
        imageColor: dto.imageColor,
        profileImage: dto.profileImage,
        backgroundImage: dto.backgroundImage,
        backgroundColor: dto.backgroundColor,
      },
      select: {
        id: true,
        name: true,
        role: true,
        description: true,
        personality: true,
        firstMessage: true,
        imageColor: true,
        profileImage: true,
        backgroundImage: true,
        backgroundColor: true,
        createdAt: true,
      },
    });

    return character;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.character.delete({
      where: { id },
    });
  }
}
