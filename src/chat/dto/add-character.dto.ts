import { IsUUID } from "class-validator";

export class AddCharacterDto {
  @IsUUID()
  characterId: string;
}
