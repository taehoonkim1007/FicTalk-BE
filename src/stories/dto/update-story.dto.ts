import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  authorName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  summary?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  coverColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImage?: string;
}
