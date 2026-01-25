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

export class CreateCharacterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  role: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  firstMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  imageColor?: string;
}

export class CreateStoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  authorName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(3000)
  summary: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverColor?: string;

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
