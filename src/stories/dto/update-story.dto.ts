import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  seriesTitle?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  authorName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  summary?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  coverColor?: string;

  @ValidateIf((o: UpdateStoryDto) => o.coverImage !== null)
  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @ValidateIf((o: UpdateStoryDto) => o.backgroundImage !== null)
  @IsOptional()
  @IsString()
  backgroundImage?: string | null;
}
