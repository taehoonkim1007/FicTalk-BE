import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

import {
  type GenerateChatResponseDto,
  type GenerateChatResponseResponse,
} from "./dto/chat-generation.dto";
import {
  type GetVoiceIdDto,
  type GetVoiceIdResponse,
  type TTSSampleDto,
  type TTSSampleResponse,
} from "./dto/tts.dto";
import {
  type GenerateBackgroundImageDto,
  type GenerateBackgroundImageResponse,
  type GenerateCharacterBackgroundImageDto,
  type GenerateCharacterBackgroundImageResponse,
  type GenerateCharactersDto,
  type GenerateCharactersResponse,
  type GenerateCoverImageDto,
  type GenerateCoverImageResponse,
  type GenerateProfileImageDto,
  type GenerateProfileImageResponse,
  type GenerateSummaryDto,
  type GenerateSummaryResponse,
} from "./dto/story-generation.dto";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly httpService: HttpService) {}

  async generateSummary(dto: GenerateSummaryDto): Promise<GenerateSummaryResponse> {
    this.logger.log(`Generating summary for: ${dto.title}`);

    const response = await firstValueFrom(
      this.httpService.post<GenerateSummaryResponse>("/api/story-generation/summary", dto),
    );

    return response.data;
  }

  async generateCharacters(dto: GenerateCharactersDto): Promise<GenerateCharactersResponse> {
    this.logger.log(`Generating characters for: ${dto.title}`);

    const response = await firstValueFrom(
      this.httpService.post<GenerateCharactersResponse>("/api/story-generation/characters", dto),
    );

    return response.data;
  }

  async generateProfileImage(dto: GenerateProfileImageDto): Promise<GenerateProfileImageResponse> {
    this.logger.log("Generating profile image");

    const response = await firstValueFrom(
      this.httpService.post<{ image_base64: string; prompt_used: string }>(
        "/api/image-generation/profile-image",
        dto,
      ),
    );

    return {
      imageBase64: response.data.image_base64,
      promptUsed: response.data.prompt_used,
    };
  }

  async generateCoverImage(dto: GenerateCoverImageDto): Promise<GenerateCoverImageResponse> {
    this.logger.log(`Generating cover image for: ${dto.title}`);

    const response = await firstValueFrom(
      this.httpService.post<{ image_base64: string; prompt_used: string }>(
        "/api/image-generation/cover-image",
        dto,
      ),
    );

    return {
      imageBase64: response.data.image_base64,
      promptUsed: response.data.prompt_used,
    };
  }

  async generateBackgroundImage(
    dto: GenerateBackgroundImageDto,
  ): Promise<GenerateBackgroundImageResponse> {
    this.logger.log(`Generating background image for: ${dto.title}`);

    const response = await firstValueFrom(
      this.httpService.post<{ image_base64: string; prompt_used: string }>(
        "/api/image-generation/background-image",
        dto,
      ),
    );

    return {
      imageBase64: response.data.image_base64,
      promptUsed: response.data.prompt_used,
    };
  }

  async generateCharacterBackgroundImage(
    dto: GenerateCharacterBackgroundImageDto,
  ): Promise<GenerateCharacterBackgroundImageResponse> {
    this.logger.log("Generating character background image");

    const response = await firstValueFrom(
      this.httpService.post<{ image_base64: string; prompt_used: string }>(
        "/api/image-generation/character-background-image",
        dto,
      ),
    );

    return {
      imageBase64: response.data.image_base64,
      promptUsed: response.data.prompt_used,
    };
  }

  async generateChatResponse(dto: GenerateChatResponseDto): Promise<string> {
    this.logger.log(`Generating chat response for character: ${dto.characterName}`);

    const response = await firstValueFrom(
      this.httpService.post<GenerateChatResponseResponse>("/api/chat/response", {
        character_name: dto.characterName,
        character_role: dto.characterRole,
        character_personality: dto.characterPersonality,
        story_title: dto.storyTitle,
        story_summary: dto.storySummary,
        messages: dto.messages,
        user_message: dto.userMessage,
      }),
    );

    return response.data.response;
  }

  async getVoiceId(dto: GetVoiceIdDto): Promise<GetVoiceIdResponse> {
    this.logger.log("Getting voice ID for character");

    const response = await firstValueFrom(
      this.httpService.post<{
        voice_id: string;
        voice_name: string;
        attributes: {
          gender: string;
          age: string;
          accent: string;
          tone: string[];
          keywords: string[];
        };
        voice_settings: {
          stability: number;
          similarity_boost: number;
          style: number;
          speed: number;
        };
      }>("/api/tts/voice-id", dto),
    );

    return {
      voiceId: response.data.voice_id,
      voiceName: response.data.voice_name,
      attributes: response.data.attributes,
      voiceSettings: {
        stability: response.data.voice_settings.stability,
        similarityBoost: response.data.voice_settings.similarity_boost,
        style: response.data.voice_settings.style,
        speed: response.data.voice_settings.speed,
      },
    };
  }

  async generateTTSSample(dto: TTSSampleDto): Promise<TTSSampleResponse> {
    this.logger.log(`Generating TTS sample for voice: ${dto.voiceId}`);

    const requestBody: {
      voice_id: string;
      text: string;
      voice_settings?: {
        stability: number;
        similarity_boost: number;
        style: number;
        speed: number;
      };
    } = {
      voice_id: dto.voiceId,
      text: dto.text,
    };

    if (dto.voiceSettings) {
      requestBody.voice_settings = {
        stability: dto.voiceSettings.stability,
        similarity_boost: dto.voiceSettings.similarityBoost,
        style: dto.voiceSettings.style,
        speed: dto.voiceSettings.speed,
      };
    }

    const response = await firstValueFrom(
      this.httpService.post<{ audio_base64: string }>("/api/tts/sample", requestBody),
    );

    return {
      audioBase64: response.data.audio_base64,
    };
  }
}
