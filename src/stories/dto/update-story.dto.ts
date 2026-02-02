import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seriesTitle?: string;

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

  @ValidateIf((o) => o.coverImage !== null)
  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @ValidateIf((o) => o.backgroundImage !== null)
  @IsOptional()
  @IsString()
  backgroundImage?: string | null;
}
