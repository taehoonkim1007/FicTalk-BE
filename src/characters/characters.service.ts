import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { FileStorageService } from "../common/services/file-storage.service";
import { type CharacterDetailResponse } from "../stories/dto/story-response.dto";
import {
  type CharactersListResponse,
  type CharacterWithStoryResponse,
} from "./dto/character-response.dto";
import { type CreateCharacterDto } from "./dto/create-character.dto";
import { type GetCharactersDto } from "./dto/get-characters.dto";
import { type UpdateCharacterDto } from "./dto/update-character.dto";
import { CharactersRepository } from "./repositories/characters.repository";

@Injectable()
export class CharactersService {
  constructor(
    private readonly charactersRepository: CharactersRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async findAll(dto: GetCharactersDto): Promise<CharactersListResponse> {
    const { characters, total } = await this.charactersRepository.findMany(dto);
    const limit = dto.limit ?? 20;

    return {
      characters,
      pagination: {
        page: dto.page ?? 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CharacterWithStoryResponse> {
    const character = await this.charactersRepository.findByIdWithDetails(id);

    if (!character) {
      throw new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND);
    }

    return character;
  }

  async create(storyId: string, dto: CreateCharacterDto): Promise<CharacterDetailResponse> {
    // base64 이미지를 파일로 저장
    const processedDto = {
      ...dto,
      profileImage: await this.fileStorageService.processImage(
        dto.profileImage,
        "characters/profileImage",
      ),
      backgroundImage: await this.fileStorageService.processImage(
        dto.backgroundImage,
        "characters/backgroundImage",
      ),
    };

    return this.charactersRepository.create(storyId, processedDto);
  }

  async update(
    id: string,
    dto: UpdateCharacterDto,
    userId: string,
  ): Promise<CharacterDetailResponse> {
    await this.verifyCharacterOwnership(id, userId);

    // base64 이미지를 파일로 저장
    const processedDto = {
      ...dto,
      profileImage: await this.fileStorageService.processImage(
        dto.profileImage,
        "characters/profileImage",
      ),
      backgroundImage: await this.fileStorageService.processImage(
        dto.backgroundImage,
        "characters/backgroundImage",
      ),
    };

    return this.charactersRepository.update(id, processedDto);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.verifyCharacterOwnership(id, userId);

    // 삭제 전 캐릭터 이미지 정보 조회
    const character = await this.charactersRepository.findByIdWithDetails(id);

    await this.charactersRepository.delete(id);

    // AI 생성 이미지 파일 삭제
    if (character) {
      await this.fileStorageService.deleteImage(character.profileImage);
      await this.fileStorageService.deleteImage(character.backgroundImage);
    }
  }

  private async verifyCharacterOwnership(characterId: string, userId: string): Promise<void> {
    const character = await this.charactersRepository.findByIdWithStory(characterId);

    if (!character) {
      throw new NotFoundException(ERROR_MESSAGES.CHARACTER_NOT_FOUND);
    }

    if (character.story.creatorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.STORY_NOT_OWNER);
    }
  }
}
