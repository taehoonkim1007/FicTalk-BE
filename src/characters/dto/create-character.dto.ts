import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

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
  @MaxLength(500)
  imageColor?: string;
}
