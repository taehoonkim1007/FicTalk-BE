import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { FileStorageService } from "../common/services/file-storage.service";
import { CharactersService } from "./characters.service";
import { type CreateCharacterDto } from "./dto/create-character.dto";
import { GetCharactersDto } from "./dto/get-characters.dto";
import { type UpdateCharacterDto } from "./dto/update-character.dto";
import { CharactersRepository } from "./repositories/characters.repository";

const mockCharactersRepository = () => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByIdWithStory: jest.fn(),
  findByIdWithDetails: jest.fn(),
  findMany: jest.fn(),
});

const mockFileStorageService = () => ({
  processImage: jest.fn().mockResolvedValue(null),
  deleteImage: jest.fn().mockResolvedValue(undefined),
});

describe("CharactersService", () => {
  let service: CharactersService;
  let repository: Record<keyof CharactersRepository, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: CharactersRepository, useFactory: mockCharactersRepository },
        { provide: FileStorageService, useFactory: mockFileStorageService },
      ],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
    repository = module.get(CharactersRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("캐릭터 목록을 역할 순서대로 정렬하여 반환해야 한다", async () => {
      // Given
      const characters = [
        { id: "1", name: "조연1", role: "조연" },
        { id: "2", name: "기타1", role: "기타" },
        { id: "3", name: "주인공1", role: "주인공" },
      ];
      repository.findMany.mockResolvedValue({ characters, total: 3 });

      // When
      const dto = Object.assign(new GetCharactersDto(), { page: 1, limit: 20 });
      const result = await service.findAll(dto);

      // Then
      expect(result.characters[0].role).toBe("주인공");
      expect(result.characters[1].role).toBe("조연");
      expect(result.characters[2].role).toBe("기타");
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it("페이지네이션이 올바르게 계산되어야 한다", async () => {
      // Given
      const characters = [{ id: "1", name: "캐릭터1", role: "주인공" }];
      repository.findMany.mockResolvedValue({ characters, total: 50 });

      // When
      const dto = Object.assign(new GetCharactersDto(), { page: 2, limit: 10 });
      const result = await service.findAll(dto);

      // Then
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });

    it("기본값으로 page 1, limit 20을 사용해야 한다", async () => {
      // Given
      repository.findMany.mockResolvedValue({ characters: [], total: 0 });

      // When
      const dto = new GetCharactersDto();
      const result = await service.findAll(dto);

      // Then
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe("findOne", () => {
    it("캐릭터가 존재하면 상세 정보를 반환해야 한다", async () => {
      // Given
      const character = {
        id: "char-1",
        name: "캐릭터1",
        role: "주인공",
        story: { id: "story-1", title: "스토리1" },
      };
      repository.findByIdWithDetails.mockResolvedValue(character);

      // When
      const result = await service.findOne("char-1");

      // Then
      expect(result).toEqual(character);
      expect(repository.findByIdWithDetails).toHaveBeenCalledWith("char-1");
    });

    it("캐릭터가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findByIdWithDetails.mockResolvedValue(null);

      // When & Then
      await expect(service.findOne("invalid-id")).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND),
      );
    });
  });

  describe("create", () => {
    const storyId = "story-1";
    const dto: CreateCharacterDto = {
      name: "캐릭터1",
      role: "주인공",
      description: "설명",
      personality: "성격",
      firstMessage: "안녕",
    };

    it("캐릭터가 정상적으로 생성되어야 한다", async () => {
      // Given
      const expectedResult = { id: "char-1", ...dto, createdAt: new Date() };
      repository.create.mockResolvedValue(expectedResult);

      // When
      const result = await service.create(storyId, dto);

      // Then
      expect(repository.create).toHaveBeenCalledWith(storyId, {
        ...dto,
        profileImage: null,
        backgroundImage: null,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe("update", () => {
    const characterId = "char-1";
    const userId = "user-1";
    const dto: UpdateCharacterDto = { name: "수정된 이름" };

    it("본인의 스토리에 속한 캐릭터라면 수정에 성공해야 한다", async () => {
      // Given
      const characterWithStory = {
        id: characterId,
        story: { creatorId: userId },
      };
      const updatedCharacter = { id: characterId, name: "수정된 이름" };

      repository.findByIdWithStory.mockResolvedValue(characterWithStory);
      repository.update.mockResolvedValue(updatedCharacter);

      // When
      const result = await service.update(characterId, dto, userId);

      // Then
      expect(repository.update).toHaveBeenCalledWith(characterId, {
        ...dto,
        profileImage: null,
        backgroundImage: null,
      });
      expect(result).toEqual(updatedCharacter);
    });

    it("캐릭터가 존재하지 않으면 NotFoundException을 던져야 한다", async () => {
      // Given
      repository.findByIdWithStory.mockResolvedValue(null);

      // When & Then
      await expect(service.update(characterId, dto, userId)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND),
      );
    });

    it("본인의 스토리가 아니라면 ForbiddenException을 던져야 한다", async () => {
      // Given
      const characterWithStory = {
        id: characterId,
        story: { creatorId: "other-user" },
      };
      repository.findByIdWithStory.mockResolvedValue(characterWithStory);

      // When & Then
      await expect(service.update(characterId, dto, userId)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER),
      );
    });
  });

  describe("delete", () => {
    const characterId = "char-1";
    const userId = "user-1";

    it("본인의 스토리에 속한 캐릭터라면 삭제에 성공해야 한다", async () => {
      // Given
      const characterWithStory = {
        id: characterId,
        story: { creatorId: userId },
      };
      const characterWithDetails = {
        id: characterId,
        profileImage: null,
        backgroundImage: null,
      };
      repository.findByIdWithStory.mockResolvedValue(characterWithStory);
      repository.findByIdWithDetails.mockResolvedValue(characterWithDetails);
      repository.delete.mockResolvedValue(undefined);

      // When
      await service.delete(characterId, userId);

      // Then
      expect(repository.delete).toHaveBeenCalledWith(characterId);
    });

    it("본인의 스토리가 아니라면 ForbiddenException을 던져야 한다", async () => {
      // Given
      const characterWithStory = {
        id: characterId,
        story: { creatorId: "other-user" },
      };
      repository.findByIdWithStory.mockResolvedValue(characterWithStory);

      // When & Then
      await expect(service.delete(characterId, userId)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER),
      );
    });
  });
});
