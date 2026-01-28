import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import { type CreateCharacterDto } from "../../characters/dto/create-character.dto";
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
          },
        },
      },
    });

    return story;
  }

  async findByIdWithCreator(id: string): Promise<{ id: string; creatorId: string | null } | null> {
    return this.prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
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
          },
        },
      },
    })) as CreatedStoryResponse;

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
          },
        },
      },
    });

    if (!story) return null;

    return {
      storyId: story.id,
      storyTitle: story.title,
      characters: story.characters,
    };
  }

  async findHeroSlides(): Promise<HeroSlideResponse[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { order: "asc" },
      select: {
        slug: true,
        stories: {
          where: {
            characters: { some: {} },
          },
          orderBy: [{ isOfficial: "desc" }, { createdAt: "desc" }],
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
            characters: {
              take: 1,
              select: {
                id: true,
                name: true,
                firstMessage: true,
              },
            },
          },
        },
      },
    });

    return categories
      .filter((cat) => cat.stories.length > 0)
      .map((cat) => {
        const randomStory = cat.stories[Math.floor(Math.random() * cat.stories.length)];
        const character = randomStory.characters[0];

        return {
          category: cat.slug,
          story: {
            id: randomStory.id,
            title: randomStory.title,
            seriesTitle: randomStory.seriesTitle,
            authorName: randomStory.authorName,
            coverColor: randomStory.coverColor,
            coverImage: randomStory.coverImage,
          },
          character: {
            id: character.id,
            name: character.name,
            firstMessage: character.firstMessage,
          },
          slide: {
            marketingTitle: randomStory.marketingTitle ?? randomStory.title,
            title: randomStory.title,
            description: randomStory.marketingDescription ?? randomStory.description,
            image: randomStory.coverImage,
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
      where.OR = [
        { title: { contains: dto.search, mode: "insensitive" } },
        { authorName: { contains: dto.search, mode: "insensitive" } },
      ];
    }

    return where;
  }
}
