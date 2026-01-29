import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

import {
  type GenerateCharactersDto,
  type GenerateCharactersResponse,
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
    this.logger.log(`Generating profile image for: ${dto.name}`);

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
}
