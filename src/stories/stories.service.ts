import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { AiService } from "../ai/ai.service";
import {
  type GenerateBackgroundImageDto,
  type GenerateBackgroundImageResponse,
  type GenerateCharacterBackgroundImageDto,
  type GenerateCharacterBackgroundImageResponse,
  type GenerateCharactersDto,
  type GenerateCharactersResponse,
  type GenerateCoverImageDto,
  type GenerateCoverImageResponse,
  type GenerateProfileImageDto,
  type GenerateProfileImageResponse,
  type GenerateSummaryDto,
  type GenerateSummaryResponse,
} from "../ai/dto/story-generation.dto";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { FileStorageService } from "../common/services/file-storage.service";
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
  constructor(
    private readonly storiesRepository: StoriesRepository,
    private readonly aiService: AiService,
    private readonly fileStorageService: FileStorageService,
  ) {}

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

    // base64 이미지를 파일로 저장
    const processedCoverImage = await this.fileStorageService.processImage(
      dto.coverImage,
      "stories/coverImage",
    );

    // 캐릭터 이미지 처리
    const processedCharacters = dto.characters
      ? await Promise.all(
          dto.characters.map(async (char) => ({
            ...char,
            profileImage: await this.fileStorageService.processImage(
              char.profileImage,
              "characters/profileImage",
            ),
            backgroundImage: await this.fileStorageService.processImage(
              char.backgroundImage,
              "characters/backgroundImage",
            ),
          })),
        )
      : undefined;

    const processedDto = {
      ...dto,
      coverImage: processedCoverImage,
      characters: processedCharacters,
    };

    return this.storiesRepository.create(processedDto, creatorId, category.id);
  }

  async update(id: string, dto: UpdateStoryDto, userId: string): Promise<UpdatedStoryResponse> {
    const story = await this.storiesRepository.findByIdWithCreator(id);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    if (story.creatorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }

    // base64 이미지를 파일로 저장
    const processedDto = {
      ...dto,
      coverImage: await this.fileStorageService.processImage(dto.coverImage, "stories/coverImage"),
    };

    return this.storiesRepository.update(id, processedDto);
  }

  async delete(id: string, userId: string): Promise<void> {
    // 전체 정보 조회 (캐릭터 이미지 포함)
    const story = await this.storiesRepository.findById(id);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    if (!story.creator || story.creator.id !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }

    await this.storiesRepository.delete(id);

    // AI 생성 이미지 파일 삭제
    await this.fileStorageService.deleteImage(story.coverImage);

    // Cascade 삭제된 캐릭터들의 이미지도 삭제
    for (const character of story.characters) {
      await this.fileStorageService.deleteImage(character.profileImage);
      await this.fileStorageService.deleteImage(character.backgroundImage);
    }
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

  // ========================
  // AI Generation
  // ========================

  generateSummary(dto: GenerateSummaryDto): Promise<GenerateSummaryResponse> {
    return this.aiService.generateSummary(dto);
  }

  generateCharacters(dto: GenerateCharactersDto): Promise<GenerateCharactersResponse> {
    return this.aiService.generateCharacters(dto);
  }

  generateProfileImage(dto: GenerateProfileImageDto): Promise<GenerateProfileImageResponse> {
    return this.aiService.generateProfileImage(dto);
  }

  generateCoverImage(dto: GenerateCoverImageDto): Promise<GenerateCoverImageResponse> {
    return this.aiService.generateCoverImage(dto);
  }

  generateBackgroundImage(
    dto: GenerateBackgroundImageDto,
  ): Promise<GenerateBackgroundImageResponse> {
    return this.aiService.generateBackgroundImage(dto);
  }

  generateCharacterBackgroundImage(
    dto: GenerateCharacterBackgroundImageDto,
  ): Promise<GenerateCharacterBackgroundImageResponse> {
    return this.aiService.generateCharacterBackgroundImage(dto);
  }
}
