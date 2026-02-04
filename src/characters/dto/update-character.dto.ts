import { CharacterRole } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEnum(CharacterRole)
  role?: CharacterRole;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

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
  @IsNotEmpty()
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
