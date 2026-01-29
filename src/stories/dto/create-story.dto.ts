import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { CreateCharacterDto } from "../../characters/dto/create-character.dto";

export class CreateStoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seriesTitle?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  authorName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  summary: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverColor?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsNotEmpty()
  @IsString()
  categorySlug: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCharacterDto)
  @ArrayMaxSize(20)
  characters?: CreateCharacterDto[];
}
