import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

// ========================
// Voice Settings
// ========================

export class VoiceSettings {
  @IsNumber()
  @Min(0)
  @Max(1)
  stability: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  similarityBoost: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  style: number;

  @IsNumber()
  @Min(0.7)
  @Max(1.2)
  speed: number;
}

// ========================
// Voice ID 조회
// ========================

export class GetVoiceIdDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  personality: string;
}

export class VoiceAttributes {
  gender: string;
  age: string;
  accent: string;
  tone: string[];
  keywords: string[];
}

export class GetVoiceIdResponse {
  voiceId: string;
  voiceName: string;
  attributes: VoiceAttributes;
  voiceSettings: VoiceSettings;
}

// ========================
// TTS 샘플 음성 생성
// ========================

export class TTSSampleDto {
  @IsNotEmpty()
  @IsString()
  voiceId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  text: string;

  @IsOptional()
  @Type(() => VoiceSettings)
  voiceSettings?: VoiceSettings;
}

export class TTSSampleResponse {
  audioBase64: string;
}
