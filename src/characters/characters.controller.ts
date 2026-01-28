import { Body, Controller, Delete, Get, Param, Patch, Query } from "@nestjs/common";

import { type AuthenticatedUser } from "../auth/types/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { type CharacterDetailResponse } from "../stories/dto/story-response.dto";
import { CharactersService } from "./characters.service";
import {
  type CharactersListResponse,
  type CharacterWithStoryResponse,
} from "./dto/character-response.dto";
import { GetCharactersDto } from "./dto/get-characters.dto";
import { UpdateCharacterDto } from "./dto/update-character.dto";

@Controller("characters")
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Public()
  @Get()
  async findAll(@Query() dto: GetCharactersDto): Promise<CharactersListResponse> {
    return this.charactersService.findAll(dto);
  }

  @Public()
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<CharacterWithStoryResponse> {
    return this.charactersService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCharacterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDetailResponse> {
    return this.charactersService.update(id, dto, user.id);
  }

  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.charactersService.delete(id, user.id);
    return { message: "캐릭터가 삭제되었습니다." };
  }
}
