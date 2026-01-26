import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { type CreateStoryDto } from "./dto/create-story.dto";
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
});

describe("StoriesService", () => {
  let service: StoriesService;
  let repository: Record<keyof StoriesRepository, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        {
          provide: StoriesRepository,
          useFactory: mockStoriesRepository,
        },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
    repository = module.get(StoriesRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
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
      expect(repository.create).toHaveBeenCalledWith(dto, userId, category.id);
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
      const story = { id: storyId, creatorId: userId };
      repository.findByIdWithCreator.mockResolvedValue(story);
      repository.delete.mockResolvedValue(undefined);

      // When
      await service.delete(storyId, userId);

      // Then
      expect(repository.delete).toHaveBeenCalledWith(storyId);
    });

    it("본인의 스토리가 아니라면 ForbiddenException을 던져야 한다", async () => {
      // Given
      const story = { id: storyId, creatorId: "other-user" };
      repository.findByIdWithCreator.mockResolvedValue(story);

      // When & Then
      await expect(service.delete(storyId, userId)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER),
      );
    });
  });
});
