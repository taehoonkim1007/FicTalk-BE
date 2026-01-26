import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { CharactersService } from "./characters.service";
import { type CreateCharacterDto } from "./dto/create-character.dto";
import { type UpdateCharacterDto } from "./dto/update-character.dto";
import { CharactersRepository } from "./repositories/characters.repository";

const mockCharactersRepository = () => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByIdWithStory: jest.fn(),
});

describe("CharactersService", () => {
  let service: CharactersService;
  let repository: Record<keyof CharactersRepository, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        {
          provide: CharactersRepository,
          useFactory: mockCharactersRepository,
        },
      ],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
    repository = module.get(CharactersRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
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
      expect(repository.create).toHaveBeenCalledWith(storyId, dto);
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
      expect(repository.update).toHaveBeenCalledWith(characterId, dto);
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
      repository.findByIdWithStory.mockResolvedValue(characterWithStory);
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
