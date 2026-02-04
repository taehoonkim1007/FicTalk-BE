import { CharacterRole } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateCharacterDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsEnum(CharacterRole)
  role: CharacterRole;

  @IsNotEmpty()
  @IsString()
  @MaxLength(400)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageColor?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsObject()
  voiceSettings?: {
    stability: number;
    similarityBoost: number;
    style: number;
    speed: number;
  };
}
