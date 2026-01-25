import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { type CreateStoryDto } from "./dto/create-story.dto";
import { type GetStoriesDto } from "./dto/get-stories.dto";
import { type HeroSlideResponse } from "./dto/hero-slide.dto";
import {
  type CharactersListResponse,
  type CreatedStoryResponse,
  type StoriesListResponse,
  type StoryDetailResponse,
  type StoryResponse,
  type UpdatedStoryResponse,
} from "./dto/story-response.dto";
import { type UpdateStoryDto } from "./dto/update-story.dto";
import { StoriesRepository } from "./repositories/stories.repository";

@Injectable()
export class StoriesService {
  constructor(private readonly storiesRepository: StoriesRepository) {}

  async findAll(dto: GetStoriesDto): Promise<StoriesListResponse> {
    const { stories, total } = await this.storiesRepository.findMany(dto);

    return {
      stories,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  async findMyStories(userId: string): Promise<StoryResponse[]> {
    return this.storiesRepository.findMyStories(userId);
  }

  async findHeroSlides(): Promise<HeroSlideResponse[]> {
    return this.storiesRepository.findHeroSlides();
  }

  async findOne(id: string): Promise<StoryDetailResponse> {
    const story = await this.storiesRepository.findById(id);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    return story;
  }

  async create(dto: CreateStoryDto, creatorId: string): Promise<CreatedStoryResponse> {
    const category = await this.storiesRepository.findCategoryBySlug(dto.categorySlug);

    if (!category) {
      throw new BadRequestException(ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }

    return this.storiesRepository.create(dto, creatorId, category.id);
  }

  async update(id: string, dto: UpdateStoryDto, userId: string): Promise<UpdatedStoryResponse> {
    const story = await this.storiesRepository.findByIdWithCreator(id);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    if (story.creatorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }

    return this.storiesRepository.update(id, dto);
  }

  async delete(id: string, userId: string): Promise<void> {
    const story = await this.storiesRepository.findByIdWithCreator(id);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    if (story.creatorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }

    await this.storiesRepository.delete(id);
  }

  async findCharacters(storyId: string): Promise<CharactersListResponse> {
    const result = await this.storiesRepository.findCharactersByStoryId(storyId);

    if (!result) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    return result;
  }

  async verifyStoryOwnership(storyId: string, userId: string): Promise<void> {
    const story = await this.storiesRepository.findByIdWithCreator(storyId);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    if (story.creatorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }
  }
}
