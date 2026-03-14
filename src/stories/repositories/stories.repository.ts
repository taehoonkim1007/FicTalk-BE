import { Injectable } from "@nestjs/common";
import { CharacterRole, type Prisma } from "@prisma/client";

import { type CreateCharacterDto } from "../../characters/dto/create-character.dto";
import { generateSearchVariations } from "../../common/utils/korean-search.util";
import { PrismaService } from "../../prisma/prisma.service";
import { type CreateStoryDto } from "../dto/create-story.dto";
import { type GetStoriesDto } from "../dto/get-stories.dto";
import { type HeroSlideResponse } from "../dto/hero-slide.dto";
import {
  type CharactersListResponse,
  type CreatedStoryResponse,
  type StoryDetailResponse,
  type StoryResponse,
  type UpdatedStoryResponse,
  type VoiceSettingsResponse,
} from "../dto/story-response.dto";
import { type UpdateStoryDto } from "../dto/update-story.dto";

@Injectable()
export class StoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(dto: GetStoriesDto): Promise<{ stories: StoryResponse[]; total: number }> {
    const where = this.buildWhereClause(dto);

    const [stories, total] = await Promise.all([
      this.prisma.story.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          seriesTitle: true,
          authorName: true,
          description: true,
          coverColor: true,
          coverImage: true,
          backgroundImage: true,
          isOfficial: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.story.count({ where }),
    ]);

    return {
      stories,
      total,
    };
  }

  async findMyStories(creatorId: string): Promise<StoryResponse[]> {
    const stories = await this.prisma.story.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        seriesTitle: true,
        authorName: true,
        description: true,
        coverColor: true,
        coverImage: true,
        backgroundImage: true,
        isOfficial: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return stories;
  }

  async findById(id: string): Promise<StoryDetailResponse | null> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        seriesTitle: true,
        authorName: true,
        description: true,
        summary: true,
        coverColor: true,
        coverImage: true,
        backgroundImage: true,
        isOfficial: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            role: true,
            description: true,
            imageColor: true,
            profileImage: true,
            backgroundImage: true,
            backgroundColor: true,
            voiceId: true,
            voiceSettings: true,
          },
        },
      },
    });

    if (!story) return null;

    this.sortCharactersByRole(story.characters);

    return {
      ...story,
      characters: story.characters.map((char) => ({
        ...char,
        voiceSettings: char.voiceSettings as VoiceSettingsResponse | null,
      })),
    };
  }

  async findByIdWithCreator(id: string): Promise<{
    id: string;
    creatorId: string | null;
    coverImage: string | null;
    backgroundImage: string | null;
  } | null> {
    return this.prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        coverImage: true,
        backgroundImage: true,
      },
    });
  }

  async findCategoryBySlug(slug: string): Promise<{ id: number } | null> {
    return this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  async create(
    dto: CreateStoryDto,
    creatorId: string,
    categoryId: number,
  ): Promise<CreatedStoryResponse> {
    const charactersData: Prisma.CharacterCreateWithoutStoryInput[] =
      dto.characters?.map((char: CreateCharacterDto) => ({
        id: char.id,
        name: char.name,
        role: char.role,
        description: char.description,
        personality: char.personality,
        firstMessage: char.firstMessage,
        imageColor: char.imageColor ?? "bg-stone-400",
        profileImage: char.profileImage,
        backgroundImage: char.backgroundImage,
        backgroundColor: char.backgroundColor ?? "bg-stone-900",
        voiceId: char.voiceId,
        voiceSettings: char.voiceSettings,
      })) ?? [];

    const story = (await this.prisma.story.create({
      data: {
        title: dto.title,
        seriesTitle: dto.seriesTitle,
        authorName: dto.authorName,
        description: dto.description,
        summary: dto.summary,
        coverColor: dto.coverColor ?? "bg-stone-800",
        coverImage: dto.coverImage,
        backgroundImage: dto.backgroundImage,
        isOfficial: false,
        categoryId,
        creatorId,
        characters: {
          create: charactersData,
        },
      },
      select: {
        id: true,
        title: true,
        seriesTitle: true,
        authorName: true,
        description: true,
        summary: true,
        coverColor: true,
        coverImage: true,
        backgroundImage: true,
        isOfficial: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            role: true,
            description: true,
            imageColor: true,
            profileImage: true,
            backgroundImage: true,
            backgroundColor: true,
            voiceId: true,
            voiceSettings: true,
          },
        },
      },
    })) as CreatedStoryResponse;

    this.sortCharactersByRole(story.characters);

    return story;
  }

  async update(id: string, dto: UpdateStoryDto): Promise<UpdatedStoryResponse> {
    const updatedStory = await this.prisma.story.update({
      where: { id },
      data: {
        title: dto.title,
        seriesTitle: dto.seriesTitle,
        authorName: dto.authorName,
        description: dto.description,
        summary: dto.summary,
        coverColor: dto.coverColor,
        coverImage: dto.coverImage,
        backgroundImage: dto.backgroundImage,
      },
      select: {
        id: true,
        title: true,
        seriesTitle: true,
        authorName: true,
        description: true,
        summary: true,
        coverColor: true,
        coverImage: true,
        backgroundImage: true,
        isOfficial: true,
        updatedAt: true,
      },
    });

    return updatedStory;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.story.delete({
      where: { id },
    });
  }

  async findCharactersByStoryId(storyId: string): Promise<CharactersListResponse | null> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        title: true,
        characters: {
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
            voiceId: true,
            voiceSettings: true,
          },
        },
      },
    });

    if (!story) return null;

    this.sortCharactersByRole(story.characters);

    return {
      storyId: story.id,
      storyTitle: story.title,
      characters: story.characters.map((char) => ({
        ...char,
        voiceSettings: char.voiceSettings as VoiceSettingsResponse | null,
      })),
    };
  }

  async findHeroSlides(): Promise<HeroSlideResponse[]> {
    // 캐릭터가 있는 스토리를 가져옴 (공식 스토리 우선, 최신순)
    const stories = await this.prisma.story.findMany({
      where: {
        characters: { some: {} },
      },
      orderBy: [{ isOfficial: "desc" }, { createdAt: "desc" }],
      take: 20, // 20개 가져와서 셔플 후 10개 선택
      select: {
        id: true,
        title: true,
        seriesTitle: true,
        authorName: true,
        description: true,
        marketingTitle: true,
        marketingDescription: true,
        coverColor: true,
        coverImage: true,
        category: {
          select: {
            slug: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            role: true,
            firstMessage: true,
          },
        },
      },
    });

    // Fisher-Yates 셔플 알고리즘으로 랜덤 정렬 후 10개 선택
    const shuffled = stories
      .filter((story) => story.characters.length > 0)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    return shuffled.map((story) => {
      // 주인공 우선, 없으면 첫 번째 캐릭터
      const character = story.characters.find((c) => c.role === "주인공") ?? story.characters[0];

      return {
        category: story.category.slug,
        story: {
          id: story.id,
          title: story.title,
          seriesTitle: story.seriesTitle,
          authorName: story.authorName,
          coverColor: story.coverColor,
          coverImage: story.coverImage,
        },
        character: {
          id: character.id,
          name: character.name,
          firstMessage: character.firstMessage,
        },
        slide: {
          marketingTitle: story.marketingTitle ?? story.title,
          title: story.title,
          description: story.marketingDescription ?? story.description,
          image: story.coverImage,
        },
      };
    });
  }

  private buildWhereClause(dto: GetStoriesDto): Prisma.StoryWhereInput {
    const where: Prisma.StoryWhereInput = {};

    if (dto.category) {
      where.category = { slug: dto.category };
    }

    if (dto.search) {
      const variations = generateSearchVariations(dto.search);
      where.OR = variations.flatMap((v) => [
        { title: { contains: v, mode: "insensitive" } },
        { authorName: { contains: v, mode: "insensitive" } },
      ]);
    }

    return where;
  }

  /**
   * 캐릭터 목록을 주인공 우선으로 정렬
   */
  private sortCharactersByRole(characters: { role: CharacterRole }[]): void {
    characters.sort((a, b) => {
      if (a.role === "주인공" && b.role !== "주인공") return -1;
      if (a.role !== "주인공" && b.role === "주인공") return 1;
      return 0;
    });
  }
}
