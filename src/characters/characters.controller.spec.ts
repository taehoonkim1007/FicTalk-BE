import { Test, type TestingModule } from "@nestjs/testing";

import type { AuthenticatedRegularUser } from "../auth/types/auth.types";
import { CharactersController } from "./characters.controller";
import { CharactersService } from "./characters.service";
import { GetCharactersDto } from "./dto/get-characters.dto";
import { type UpdateCharacterDto } from "./dto/update-character.dto";

describe("CharactersController", () => {
  let controller: CharactersController;

  const mockUser: AuthenticatedRegularUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    profileImage: "image.jpg",
    role: "user",
  };

  const mockCharacter = {
    id: "char-123",
    name: "Test Character",
    role: "PROTAGONIST" as const,
    description: "A test character",
    profileImage: "profile.jpg",
    backgroundImage: "bg.jpg",
    personality: "Friendly",
    firstMessage: "Hello!",
  };

  const mockCharactersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CharactersController],
      providers: [{ provide: CharactersService, useValue: mockCharactersService }],
    }).compile();

    controller = module.get<CharactersController>(CharactersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("컨트롤러가 정의되어 있어야 합니다", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("캐릭터 목록을 반환해야 합니다", async () => {
      const dto = new GetCharactersDto();
      dto.page = 1;
      dto.limit = 20;
      const mockResponse = { characters: [mockCharacter], total: 1, hasMore: false };
      mockCharactersService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(dto);

      expect(result).toEqual(mockResponse);
      expect(mockCharactersService.findAll).toHaveBeenCalledWith(dto);
    });
  });

  describe("findOne", () => {
    it("캐릭터 상세 정보를 반환해야 합니다", async () => {
      mockCharactersService.findOne.mockResolvedValue(mockCharacter);

      const result = await controller.findOne("char-123");

      expect(result).toEqual(mockCharacter);
      expect(mockCharactersService.findOne).toHaveBeenCalledWith("char-123");
    });
  });

  describe("update", () => {
    it("캐릭터를 수정해야 합니다", async () => {
      const updateDto: UpdateCharacterDto = { name: "Updated Character" };
      mockCharactersService.update.mockResolvedValue({ ...mockCharacter, ...updateDto });

      const result = await controller.update("char-123", updateDto, mockUser);

      expect(result.name).toBe("Updated Character");
      expect(mockCharactersService.update).toHaveBeenCalledWith("char-123", updateDto, "user-123");
    });
  });

  describe("delete", () => {
    it("캐릭터를 삭제해야 합니다", async () => {
      mockCharactersService.delete.mockResolvedValue(undefined);

      const result = await controller.delete("char-123", mockUser);

      expect(result).toEqual({ message: "캐릭터가 삭제되었습니다." });
      expect(mockCharactersService.delete).toHaveBeenCalledWith("char-123", "user-123");
    });
  });
});
