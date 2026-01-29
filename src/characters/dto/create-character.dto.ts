import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateCharacterDto {
  @IsOptional()
  @IsUUID()
  id?: string;

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
  @MaxLength(500)
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
}
