import { IsNotEmpty, IsString, MaxLength } from "class-validator";

// ========================
// 줄거리 생성
// ========================

export class GenerateSummaryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;
}

export class GenerateSummaryResponse {
  summary: string;
}

// ========================
// 캐릭터 생성
// ========================

export class GenerateCharactersDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  summary: string;
}

export class GeneratedCharacter {
  name: string;
  role: string;
  description: string;
  personality: string;
  firstMessage: string;
}

export class GenerateCharactersResponse {
  characters: GeneratedCharacter[];
}

// ========================
// 프로필 이미지 생성
// ========================

export class GenerateProfileImageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  personality: string;
}

export class GenerateProfileImageResponse {
  imageBase64: string;
  promptUsed: string;
}

// ========================
// 커버 이미지 생성
// ========================

export class GenerateCoverImageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  summary: string;
}

export class GenerateCoverImageResponse {
  imageBase64: string;
  promptUsed: string;
}

// ========================
// 배경 이미지 생성
// ========================

export class GenerateBackgroundImageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  summary: string;
}

export class GenerateBackgroundImageResponse {
  imageBase64: string;
  promptUsed: string;
}

// ========================
// 캐릭터 배경 이미지 생성
// ========================

export class GenerateCharacterBackgroundImageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  personality: string;
}

export class GenerateCharacterBackgroundImageResponse {
  imageBase64: string;
  promptUsed: string;
}
