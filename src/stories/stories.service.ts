import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import {
  type GetVoiceIdDto,
  type GetVoiceIdResponse,
  type TTSSampleDto,
  type TTSSampleResponse,
} from "../ai/dto/tts.dto";
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
  private readonly logger = new Logger(StoriesService.name);

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
    const processedBackgroundImage = await this.fileStorageService.processImage(
      dto.backgroundImage,
      "stories/backgroundImage",
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
      backgroundImage: processedBackgroundImage,
      characters: processedCharacters,
    };

    const createdStory = await this.storiesRepository.create(processedDto, creatorId, category.id);

    // RAG 임베딩 생성 (비동기, 응답 차단 안 함)
    this.processEmbeddingAsync(createdStory.id, dto.summary);

    return createdStory;
  }

  async update(id: string, dto: UpdateStoryDto, userId: string): Promise<UpdatedStoryResponse> {
    const story = await this.storiesRepository.findByIdWithCreator(id);

    if (!story) {
      throw new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND);
    }

    if (story.creatorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }

    // 이미지 처리: null = 삭제, string = 새 이미지, undefined = 변경 안 함
    let processedCoverImage: string | null | undefined;
    let processedBackgroundImage: string | null | undefined;

    if (dto.coverImage === null) {
      // 기존 이미지 삭제
      await this.fileStorageService.deleteImage(story.coverImage);
      processedCoverImage = null;
    } else if (dto.coverImage !== undefined) {
      // 새 이미지 처리
      processedCoverImage = await this.fileStorageService.processImage(
        dto.coverImage,
        "stories/coverImage",
      );
    }

    if (dto.backgroundImage === null) {
      // 기존 이미지 삭제
      await this.fileStorageService.deleteImage(story.backgroundImage);
      processedBackgroundImage = null;
    } else if (dto.backgroundImage !== undefined) {
      // 새 이미지 처리
      processedBackgroundImage = await this.fileStorageService.processImage(
        dto.backgroundImage,
        "stories/backgroundImage",
      );
    }

    const processedDto = {
      ...dto,
      coverImage: processedCoverImage,
      backgroundImage: processedBackgroundImage,
    };

    const updatedStory = await this.storiesRepository.update(id, processedDto);

    // RAG 임베딩 갱신 (summary가 변경된 경우만)
    if (dto.summary) {
      this.processEmbeddingAsync(id, dto.summary);
    }

    return updatedStory;
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
    await this.fileStorageService.deleteImage(story.backgroundImage);

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

  async generateSummary(dto: GenerateSummaryDto): Promise<GenerateSummaryResponse> {
    return await this.aiService.generateSummary(dto);
  }

  async generateCharacters(dto: GenerateCharactersDto): Promise<GenerateCharactersResponse> {
    return await this.aiService.generateCharacters(dto);
  }

  async generateProfileImage(dto: GenerateProfileImageDto): Promise<GenerateProfileImageResponse> {
    return await this.aiService.generateProfileImage(dto);
  }

  async generateCoverImage(dto: GenerateCoverImageDto): Promise<GenerateCoverImageResponse> {
    return await this.aiService.generateCoverImage(dto);
  }

  async generateBackgroundImage(
    dto: GenerateBackgroundImageDto,
  ): Promise<GenerateBackgroundImageResponse> {
    return await this.aiService.generateBackgroundImage(dto);
  }

  async generateCharacterBackgroundImage(
    dto: GenerateCharacterBackgroundImageDto,
  ): Promise<GenerateCharacterBackgroundImageResponse> {
    return await this.aiService.generateCharacterBackgroundImage(dto);
  }

  async getVoiceId(dto: GetVoiceIdDto): Promise<GetVoiceIdResponse> {
    return await this.aiService.getVoiceId(dto);
  }

  async generateTTSSample(dto: TTSSampleDto): Promise<TTSSampleResponse> {
    return await this.aiService.generateTTSSample(dto);
  }

  // ========================
  // RAG Embedding
  // ========================

  /**
   * 스토리 임베딩 비동기 처리
   * 사용자 응답을 차단하지 않고 백그라운드에서 처리
   */
  private processEmbeddingAsync(storyId: string, summary: string): void {
    this.aiService
      .processStoryEmbedding(storyId, summary)
      .then((chunkCount) => {
        this.logger.log(`Story ${storyId}: ${chunkCount} embedding chunks created`);
      })
      .catch((error: Error) => {
        this.logger.error(`Story ${storyId}: Failed to create embeddings - ${error.message}`);
      });
  }
}
