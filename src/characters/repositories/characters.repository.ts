import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { type CreateCharacterDto } from "../dto/create-character.dto";
import { type UpdateCharacterDto } from "../dto/update-character.dto";

export interface CharacterWithStory {
  id: string;
  storyId: string;
  story: {
    creatorId: string | null;
  };
}

export interface CharacterDetail {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string | null;
  firstMessage: string | null;
  imageColor: string;
  createdAt: Date;
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

  async create(storyId: string, dto: CreateCharacterDto): Promise<CharacterDetail> {
    return this.prisma.character.create({
      data: {
        id: dto.id,
        storyId,
        name: dto.name,
        role: dto.role,
        description: dto.description,
        personality: dto.personality,
        firstMessage: dto.firstMessage,
        imageColor: dto.imageColor ?? "bg-stone-400",
      },
      select: {
        id: true,
        name: true,
        role: true,
        description: true,
        personality: true,
        firstMessage: true,
        imageColor: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateCharacterDto): Promise<CharacterDetail> {
    return this.prisma.character.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        description: dto.description,
        personality: dto.personality,
        firstMessage: dto.firstMessage,
        imageColor: dto.imageColor,
      },
      select: {
        id: true,
        name: true,
        role: true,
        description: true,
        personality: true,
        firstMessage: true,
        imageColor: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.character.delete({
      where: { id },
    });
  }
}
