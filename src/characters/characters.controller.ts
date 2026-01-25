import { Body, Controller, Delete, Param, Patch } from "@nestjs/common";

import { type AuthenticatedUser } from "../auth/types/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CharactersService } from "./characters.service";
import { UpdateCharacterDto } from "./dto/update-character.dto";
import { type CharacterDetail } from "./repositories/characters.repository";

@Controller("characters")
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCharacterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CharacterDetail> {
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
