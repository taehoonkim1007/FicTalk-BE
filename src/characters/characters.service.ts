import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { type CreateCharacterDto } from "./dto/create-character.dto";
import { type UpdateCharacterDto } from "./dto/update-character.dto";
import { CharactersRepository, type CharacterDetail } from "./repositories/characters.repository";

@Injectable()
export class CharactersService {
  constructor(private readonly charactersRepository: CharactersRepository) {}

  async create(storyId: string, dto: CreateCharacterDto): Promise<CharacterDetail> {
    return this.charactersRepository.create(storyId, dto);
  }

  async update(id: string, dto: UpdateCharacterDto, userId: string): Promise<CharacterDetail> {
    await this.verifyCharacterOwnership(id, userId);
    return this.charactersRepository.update(id, dto);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.verifyCharacterOwnership(id, userId);
    await this.charactersRepository.delete(id);
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
