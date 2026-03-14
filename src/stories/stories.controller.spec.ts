import { Test, type TestingModule } from "@nestjs/testing";

import type {
  GenerateBackgroundImageDto,
  GenerateCharacterBackgroundImageDto,
  GenerateCharactersDto,
  GenerateCoverImageDto,
  GenerateProfileImageDto,
  GenerateSummaryDto,
} from "../ai/dto/story-generation.dto";
import type { GetVoiceIdDto, TTSSampleDto } from "../ai/dto/tts.dto";
import type { AuthenticatedRegularUser } from "../auth/types/auth.types";
import { CharactersService } from "../characters/characters.service";
import { type CreateCharacterDto } from "../characters/dto/create-character.dto";
import { type CreateStoryDto } from "./dto/create-story.dto";
import { GetStoriesDto } from "./dto/get-stories.dto";
import { type UpdateStoryDto } from "./dto/update-story.dto";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";

describe("StoriesController", () => {
  let controller: StoriesController;

  const mockUser: AuthenticatedRegularUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    profileImage: "image.jpg",
    role: "user",
  };

  const mockStory = {
    id: "story-123",
    title: "Test Story",
    summary: "Test summary",
    coverImage: "cover.jpg",
    backgroundImage: "bg.jpg",
    isPublic: true,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: "user-123", name: "Test User" },
  };

  const mockCharacter = {
    id: "char-123",
    name: "Test Character",
    role: "PROTAGONIST" as const,
    description: "A test character",
    profileImage: "profile.jpg",
  };

  const mockStoriesService = {
    findHeroSlides: jest.fn(),
    findMyStories: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    generateSummary: jest.fn(),
    generateCharacters: jest.fn(),
    generateProfileImage: jest.fn(),
    generateCoverImage: jest.fn(),
    generateBackgroundImage: jest.fn(),
    generateCharacterBackgroundImage: jest.fn(),
    getVoiceId: jest.fn(),
    generateTTSSample: jest.fn(),
    findCharacters: jest.fn(),
    verifyStoryOwnership: jest.fn(),
  };

  const mockCharactersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [
        { provide: StoriesService, useValue: mockStoriesService },
        { provide: CharactersService, useValue: mockCharactersService },
      ],
    }).compile();

    controller = module.get<StoriesController>(StoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("컨트롤러가 정의되어 있어야 합니다", () => {
    expect(controller).toBeDefined();
  });

  describe("findHeroSlides", () => {
    it("히어로 슬라이드 목록을 반환해야 합니다", async () => {
      const mockSlides = [{ id: "story-1", title: "Story 1" }];
      mockStoriesService.findHeroSlides.mockResolvedValue(mockSlides);

      const result = await controller.findHeroSlides();

      expect(result).toEqual(mockSlides);
      expect(mockStoriesService.findHeroSlides).toHaveBeenCalled();
    });
  });

  describe("findMyStories", () => {
    it("내 스토리 목록을 반환해야 합니다", async () => {
      mockStoriesService.findMyStories.mockResolvedValue([mockStory]);

      const result = await controller.findMyStories(mockUser);

      expect(result).toEqual([mockStory]);
      expect(mockStoriesService.findMyStories).toHaveBeenCalledWith("user-123");
    });
  });

  describe("findAll", () => {
    it("전체 스토리 목록을 반환해야 합니다", async () => {
      const dto = new GetStoriesDto();
      dto.page = 1;
      dto.limit = 10;
      const mockResponse = { stories: [mockStory], total: 1, hasMore: false };
      mockStoriesService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(dto);

      expect(result).toEqual(mockResponse);
      expect(mockStoriesService.findAll).toHaveBeenCalledWith(dto);
    });
  });

  describe("findOne", () => {
    it("스토리 상세 정보를 반환해야 합니다", async () => {
      mockStoriesService.findOne.mockResolvedValue(mockStory);

      const result = await controller.findOne("story-123");

      expect(result).toEqual(mockStory);
      expect(mockStoriesService.findOne).toHaveBeenCalledWith("story-123");
    });
  });

  describe("create", () => {
    it("새 스토리를 생성해야 합니다", async () => {
      const createDto: CreateStoryDto = {
        title: "New Story",
        authorName: "Author",
        description: "Description",
        summary: "Summary",
        categorySlug: "fantasy",
      };
      mockStoriesService.create.mockResolvedValue({ ...mockStory, ...createDto });

      const result = await controller.create(createDto, mockUser);

      expect(result.title).toBe("New Story");
      expect(mockStoriesService.create).toHaveBeenCalledWith(createDto, "user-123");
    });
  });

  describe("update", () => {
    it("스토리를 수정해야 합니다", async () => {
      const updateDto: UpdateStoryDto = { title: "Updated Story" };
      mockStoriesService.update.mockResolvedValue({ ...mockStory, ...updateDto });

      const result = await controller.update("story-123", updateDto, mockUser);

      expect(result.title).toBe("Updated Story");
      expect(mockStoriesService.update).toHaveBeenCalledWith("story-123", updateDto, "user-123");
    });
  });

  describe("delete", () => {
    it("스토리를 삭제해야 합니다", async () => {
      mockStoriesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete("story-123", mockUser);

      expect(result).toEqual({ message: "스토리가 삭제되었습니다." });
      expect(mockStoriesService.delete).toHaveBeenCalledWith("story-123", "user-123");
    });
  });

  describe("AI Generation Endpoints", () => {
    it("generateSummary가 요약을 생성해야 합니다", async () => {
      const dto: GenerateSummaryDto = { title: "Test", description: "Content" };
      const mockResponse = { summary: "Generated summary" };
      mockStoriesService.generateSummary.mockResolvedValue(mockResponse);

      const result = await controller.generateSummary(dto);

      expect(result).toEqual(mockResponse);
    });

    it("generateCharacters가 캐릭터를 생성해야 합니다", async () => {
      const dto: GenerateCharactersDto = { title: "Test", description: "Desc", summary: "Summary" };
      const mockResponse = { characters: [mockCharacter] };
      mockStoriesService.generateCharacters.mockResolvedValue(mockResponse);

      const result = await controller.generateCharacters(dto);

      expect(result).toEqual(mockResponse);
    });

    it("generateProfileImage가 프로필 이미지를 생성해야 합니다", async () => {
      const dto: GenerateProfileImageDto = { description: "Desc", personality: "Friendly" };
      const mockResponse = { imageBase64: "base64data", promptUsed: "prompt" };
      mockStoriesService.generateProfileImage.mockResolvedValue(mockResponse);

      const result = await controller.generateProfileImage(dto);

      expect(result).toEqual(mockResponse);
    });

    it("generateCoverImage가 커버 이미지를 생성해야 합니다", async () => {
      const dto: GenerateCoverImageDto = { title: "Test", description: "Desc", summary: "Summary" };
      const mockResponse = { imageBase64: "base64data", promptUsed: "prompt" };
      mockStoriesService.generateCoverImage.mockResolvedValue(mockResponse);

      const result = await controller.generateCoverImage(dto);

      expect(result).toEqual(mockResponse);
    });

    it("generateBackgroundImage가 배경 이미지를 생성해야 합니다", async () => {
      const dto: GenerateBackgroundImageDto = {
        title: "Test",
        description: "Desc",
        summary: "Summary",
      };
      const mockResponse = { imageBase64: "base64data", promptUsed: "prompt" };
      mockStoriesService.generateBackgroundImage.mockResolvedValue(mockResponse);

      const result = await controller.generateBackgroundImage(dto);

      expect(result).toEqual(mockResponse);
    });

    it("generateCharacterBackgroundImage가 캐릭터 배경 이미지를 생성해야 합니다", async () => {
      const dto: GenerateCharacterBackgroundImageDto = {
        description: "Desc",
        personality: "Friendly",
      };
      const mockResponse = { imageBase64: "base64data", promptUsed: "prompt" };
      mockStoriesService.generateCharacterBackgroundImage.mockResolvedValue(mockResponse);

      const result = await controller.generateCharacterBackgroundImage(dto);

      expect(result).toEqual(mockResponse);
    });

    it("getVoiceId가 음성 ID를 반환해야 합니다", async () => {
      const dto: GetVoiceIdDto = { description: "Test character", personality: "Friendly" };
      const mockResponse = {
        voiceId: "voice-123",
        voiceName: "Voice Name",
        attributes: { gender: "male", age: "young", accent: "korean", tone: [], keywords: [] },
        voiceSettings: { stability: 0.5, similarityBoost: 0.5, style: 0.5, speed: 1 },
      };
      mockStoriesService.getVoiceId.mockResolvedValue(mockResponse);

      const result = await controller.getVoiceId(dto);

      expect(result).toEqual(mockResponse);
    });

    it("generateTTSSample이 TTS 샘플을 생성해야 합니다", async () => {
      const dto: TTSSampleDto = { voiceId: "voice-123", text: "Hello" };
      const mockResponse = { audioBase64: "audiodata" };
      mockStoriesService.generateTTSSample.mockResolvedValue(mockResponse);

      const result = await controller.generateTTSSample(dto);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("Characters Endpoints", () => {
    it("findCharacters가 스토리의 캐릭터 목록을 반환해야 합니다", async () => {
      const mockResponse = { characters: [mockCharacter] };
      mockStoriesService.findCharacters.mockResolvedValue(mockResponse);

      const result = await controller.findCharacters("story-123");

      expect(result).toEqual(mockResponse);
      expect(mockStoriesService.findCharacters).toHaveBeenCalledWith("story-123");
    });

    it("createCharacter가 스토리에 캐릭터를 생성해야 합니다", async () => {
      const createDto: CreateCharacterDto = {
        name: "New Character",
        role: "주인공",
        description: "A new character",
      };
      mockStoriesService.verifyStoryOwnership.mockResolvedValue(undefined);
      mockCharactersService.create.mockResolvedValue({ ...mockCharacter, ...createDto });

      const result = await controller.createCharacter("story-123", createDto, mockUser);

      expect(result.name).toBe("New Character");
      expect(mockStoriesService.verifyStoryOwnership).toHaveBeenCalledWith("story-123", "user-123");
      expect(mockCharactersService.create).toHaveBeenCalledWith("story-123", createDto);
    });
  });
});
