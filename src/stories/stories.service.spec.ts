import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { AiService } from "../ai/ai.service";
import type {
  GenerateBackgroundImageDto,
  GenerateCharacterBackgroundImageDto,
  GenerateCharactersDto,
  GenerateCoverImageDto,
  GenerateProfileImageDto,
  GenerateSummaryDto,
} from "../ai/dto/story-generation.dto";
import type { GetVoiceIdDto, TTSSampleDto } from "../ai/dto/tts.dto";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { FileStorageService } from "../common/services/file-storage.service";
import { type CreateStoryDto } from "./dto/create-story.dto";
import { GetStoriesDto } from "./dto/get-stories.dto";
import { type UpdateStoryDto } from "./dto/update-story.dto";
import { StoriesRepository } from "./repositories/stories.repository";
import { StoriesService } from "./stories.service";

const mockStoriesRepository = () => ({
  findCategoryBySlug: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
  findById: jest.fn(),
  findByIdWithCreator: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findHeroSlides: jest.fn(),
  findCharactersByStoryId: jest.fn(),
  findMyStories: jest.fn(),
});

const mockAiService = () => ({
  generateSummary: jest.fn(),
  generateCharacters: jest.fn(),
  generateProfileImage: jest.fn(),
  generateCoverImage: jest.fn(),
  generateBackgroundImage: jest.fn(),
  generateCharacterBackgroundImage: jest.fn(),
  generateChatResponse: jest.fn(),
  processStoryEmbedding: jest.fn().mockResolvedValue(0),
  getVoiceId: jest.fn(),
  generateTTSSample: jest.fn(),
});

const mockFileStorageService = () => ({
  processImage: jest.fn().mockResolvedValue(null),
  deleteImage: jest.fn().mockResolvedValue(undefined),
});

describe("StoriesService", () => {
  let service: StoriesService;
  let repository: Record<keyof StoriesRepository, jest.Mock>;
  let aiService: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: StoriesRepository, useFactory: mockStoriesRepository },
        { provide: AiService, useFactory: mockAiService },
        { provide: FileStorageService, useFactory: mockFileStorageService },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
    repository = module.get(StoriesRepository);
    aiService = module.get(AiService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("스토리 목록과 페이지네이션을 반환해야 한다", async () => {
      // Given
      const dto = Object.assign(new GetStoriesDto(), { page: 1, limit: 10 });
      const stories = [{ id: "story-1", title: "스토리1" }];
      repository.findMany.mockResolvedValue({ stories, total: 25 });

      // When
      const result = await service.findAll(dto);

      // Then
      expect(result.stories).toEqual(stories);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });

  describe("findMyStories", () => {
    it("사용자의 스토리 목록을 반환해야 한다", async () => {
      // Given
      const userId = "user-1";
      const stories = [{ id: "story-1", title: "내 스토리" }];
      repository.findMyStories.mockResolvedValue(stories);

      // When
      const result = await service.findMyStories(userId);

      // Then
      expect(result).toEqual(stories);
      expect(repository.findMyStories).toHaveBeenCalledWith(userId);
    });
  });

  describe("findHeroSlides", () => {
    it("히어로 슬라이드 목록을 반환해야 한다", async () => {
      // Given
      const slides = [{ id: "story-1", title: "인기 스토리", coverImage: "cover.jpg" }];
      repository.findHeroSlides.mockResolvedValue(slides);

      // When
      const result = await service.findHeroSlides();

      // Then
      expect(result).toEqual(slides);
      expect(repository.findHeroSlides).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("스토리가 존재하면 상세 정보를 반환해야 한다", async () => {
      // Given
      const story = { id: "story-1", title: "스토리1", characters: [] };
      repository.findById.mockResolvedValue(story);

      // When
      const result = await service.findOne("story-1");

      // Then
      expect(result).toEqual(story);
    });

    it("스토리가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findById.mockResolvedValue(null);

      // When & Then
      await expect(service.findOne("invalid-id")).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND),
      );
    });
  });

  describe("findCharacters", () => {
    it("스토리의 캐릭터 목록을 반환해야 한다", async () => {
      // Given
      const characters = { characters: [{ id: "char-1", name: "캐릭터1" }] };
      repository.findCharactersByStoryId.mockResolvedValue(characters);

      // When
      const result = await service.findCharacters("story-1");

      // Then
      expect(result).toEqual(characters);
    });

    it("스토리가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findCharactersByStoryId.mockResolvedValue(null);

      // When & Then
      await expect(service.findCharacters("invalid-id")).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND),
      );
    });
  });

  describe("verifyStoryOwnership", () => {
    it("본인의 스토리면 에러 없이 통과해야 한다", async () => {
      // Given
      const story = { id: "story-1", creatorId: "user-1" };
      repository.findByIdWithCreator.mockResolvedValue(story);

      // When & Then
      await expect(service.verifyStoryOwnership("story-1", "user-1")).resolves.not.toThrow();
    });

    it("스토리가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findByIdWithCreator.mockResolvedValue(null);

      // When & Then
      await expect(service.verifyStoryOwnership("invalid-id", "user-1")).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND),
      );
    });

    it("본인의 스토리가 아니면 ForbiddenException을 던져야 한다", async () => {
      // Given
      const story = { id: "story-1", creatorId: "other-user" };
      repository.findByIdWithCreator.mockResolvedValue(story);

      // When & Then
      await expect(service.verifyStoryOwnership("story-1", "user-1")).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER),
      );
    });
  });

  describe("AI Generation Methods", () => {
    it("generateSummary가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GenerateSummaryDto = { title: "테스트", description: "설명" };
      const response = { summary: "생성된 줄거리" };
      aiService.generateSummary.mockResolvedValue(response);

      // When
      const result = await service.generateSummary(dto);

      // Then
      expect(result).toEqual(response);
      expect(aiService.generateSummary).toHaveBeenCalledWith(dto);
    });

    it("generateCharacters가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GenerateCharactersDto = {
        title: "테스트 스토리",
        description: "스토리 설명",
        summary: "줄거리",
      };
      const response = { characters: [{ name: "캐릭터1" }] };
      aiService.generateCharacters.mockResolvedValue(response);

      // When
      const result = await service.generateCharacters(dto);

      // Then
      expect(result).toEqual(response);
      expect(aiService.generateCharacters).toHaveBeenCalledWith(dto);
    });

    it("generateProfileImage가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GenerateProfileImageDto = {
        description: "캐릭터 설명",
        personality: "밝고 활발한 성격",
      };
      const response = { imageBase64: "base64...", promptUsed: "prompt" };
      aiService.generateProfileImage.mockResolvedValue(response);

      // When
      const result = await service.generateProfileImage(dto);

      // Then
      expect(result).toEqual(response);
    });

    it("generateCoverImage가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GenerateCoverImageDto = {
        title: "제목",
        description: "스토리 설명",
        summary: "줄거리",
      };
      const response = { imageBase64: "base64...", promptUsed: "prompt" };
      aiService.generateCoverImage.mockResolvedValue(response);

      // When
      const result = await service.generateCoverImage(dto);

      // Then
      expect(result).toEqual(response);
    });

    it("generateBackgroundImage가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GenerateBackgroundImageDto = {
        title: "제목",
        description: "스토리 설명",
        summary: "줄거리",
      };
      const response = { imageBase64: "base64...", promptUsed: "prompt" };
      aiService.generateBackgroundImage.mockResolvedValue(response);

      // When
      const result = await service.generateBackgroundImage(dto);

      // Then
      expect(result).toEqual(response);
    });

    it("generateCharacterBackgroundImage가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GenerateCharacterBackgroundImageDto = {
        description: "캐릭터 설명",
        personality: "밝고 활발한 성격",
      };
      const response = { imageBase64: "base64...", promptUsed: "prompt" };
      aiService.generateCharacterBackgroundImage.mockResolvedValue(response);

      // When
      const result = await service.generateCharacterBackgroundImage(dto);

      // Then
      expect(result).toEqual(response);
    });

    it("getVoiceId가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: GetVoiceIdDto = {
        description: "젊은 여성 캐릭터",
        personality: "밝고 활발한 성격",
      };
      const response = { voiceId: "voice-123" };
      aiService.getVoiceId.mockResolvedValue(response);

      // When
      const result = await service.getVoiceId(dto);

      // Then
      expect(result).toEqual(response);
    });

    it("generateTTSSample가 AI 서비스를 호출해야 한다", async () => {
      // Given
      const dto: TTSSampleDto = { voiceId: "voice-123", text: "안녕하세요" };
      const response = { audioUrl: "sample.mp3" };
      aiService.generateTTSSample.mockResolvedValue(response);

      // When
      const result = await service.generateTTSSample(dto);

      // Then
      expect(result).toEqual(response);
    });
  });

  describe("create", () => {
    const userId = "user-1";
    const dto: CreateStoryDto = {
      title: "테스트 스토리",
      authorName: "작가",
      description: "설명",
      summary: "줄거리",
      categorySlug: "world-lit",
    };

    it("카테고리가 유효하면 스토리를 생성해야 한다", async () => {
      // Given
      const category = { id: 1, slug: "world-lit" };
      const createdStory = { id: "story-1", ...dto, category, characters: [] };

      repository.findCategoryBySlug.mockResolvedValue(category);
      repository.create.mockResolvedValue(createdStory);

      // When
      const result = await service.create(dto, userId);

      // Then
      expect(repository.findCategoryBySlug).toHaveBeenCalledWith(dto.categorySlug);
      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual(createdStory);
    });

    it("존재하지 않는 카테고리라면 BadRequestException을 던져야 한다", async () => {
      // Given
      repository.findCategoryBySlug.mockResolvedValue(null);

      // When & Then
      await expect(service.create(dto, userId)).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.CATEGORY_NOT_FOUND),
      );
    });
  });

  describe("update", () => {
    const storyId = "story-1";
    const userId = "user-1";
    const dto: UpdateStoryDto = { title: "수정된 제목" };

    it("본인의 스토리라면 수정에 성공해야 한다", async () => {
      // Given
      const story = { id: storyId, creatorId: userId };
      repository.findByIdWithCreator.mockResolvedValue(story);
      repository.update.mockResolvedValue({ id: storyId, title: "수정된 제목" });

      // When
      const result = await service.update(storyId, dto, userId);

      // Then
      expect(repository.update).toHaveBeenCalledWith(storyId, dto);
      expect(result).toEqual({ id: storyId, title: "수정된 제목" });
    });

    it("스토리가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findByIdWithCreator.mockResolvedValue(null);

      // When & Then
      await expect(service.update(storyId, dto, userId)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND),
      );
    });

    it("본인의 스토리가 아니라면 ForbiddenException을 던져야 한다", async () => {
      // Given
      const story = { id: storyId, creatorId: "other-user" };
      repository.findByIdWithCreator.mockResolvedValue(story);

      // When & Then
      await expect(service.update(storyId, dto, userId)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER),
      );
    });
  });

  describe("delete", () => {
    const storyId = "story-1";
    const userId = "user-1";

    it("본인의 스토리라면 삭제에 성공해야 한다", async () => {
      // Given
      const story = {
        id: storyId,
        creator: { id: userId, name: "테스트" },
        coverImage: null,
        backgroundImage: null,
        characters: [],
      };
      repository.findById.mockResolvedValue(story);
      repository.delete.mockResolvedValue(undefined);

      // When
      await service.delete(storyId, userId);

      // Then
      expect(repository.delete).toHaveBeenCalledWith(storyId);
    });

    it("스토리가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findById.mockResolvedValue(null);

      // When & Then
      await expect(service.delete(storyId, userId)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.STORY_NOT_FOUND),
      );
    });

    it("본인의 스토리가 아니라면 ForbiddenException을 던져야 한다", async () => {
      // Given
      const story = {
        id: storyId,
        creator: { id: "other-user", name: "다른 사용자" },
        coverImage: null,
        backgroundImage: null,
        characters: [],
      };
      repository.findById.mockResolvedValue(story);

      // When & Then
      await expect(service.delete(storyId, userId)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER),
      );
    });
  });
});
