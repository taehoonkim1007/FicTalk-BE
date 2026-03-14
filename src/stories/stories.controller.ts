import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
  GenerateBackgroundImageDto,
  GenerateCharacterBackgroundImageDto,
  GenerateCharactersDto,
  GenerateCoverImageDto,
  GenerateProfileImageDto,
  GenerateSummaryDto,
  type GenerateBackgroundImageResponse,
  type GenerateCharacterBackgroundImageResponse,
  type GenerateCharactersResponse,
  type GenerateCoverImageResponse,
  type GenerateProfileImageResponse,
  type GenerateSummaryResponse,
} from "../ai/dto/story-generation.dto";
import {
  GetVoiceIdDto,
  TTSSampleDto,
  type GetVoiceIdResponse,
  type TTSSampleResponse,
} from "../ai/dto/tts.dto";
import { type AuthenticatedUser } from "../auth/types/auth.types";
import { CharactersService } from "../characters/characters.service";
import { CreateCharacterDto } from "../characters/dto/create-character.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CreateStoryDto } from "./dto/create-story.dto";
import { GetStoriesDto } from "./dto/get-stories.dto";
import { type HeroSlideResponse } from "./dto/hero-slide.dto";
import {
  type CharactersListResponse,
  type CreatedStoryResponse,
  type StoriesListResponse,
  type StoryDetailResponse,
  type StoryResponse,
  type UpdatedStoryResponse,
} from "./dto/story-response.dto";
import { UpdateStoryDto } from "./dto/update-story.dto";
import { StoriesService } from "./stories.service";

@Controller("stories")
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly charactersService: CharactersService,
  ) {}

  @Public()
  @Get("hero-slides")
  async findHeroSlides(): Promise<HeroSlideResponse[]> {
    return this.storiesService.findHeroSlides();
  }

  @Get("me")
  async findMyStories(@CurrentUser() user: AuthenticatedUser): Promise<StoryResponse[]> {
    return this.storiesService.findMyStories(user.id);
  }

  @Public()
  @Get()
  async findAll(@Query() dto: GetStoriesDto): Promise<StoriesListResponse> {
    return this.storiesService.findAll(dto);
  }

  @Public()
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<StoryDetailResponse> {
    return this.storiesService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatedStoryResponse> {
    return this.storiesService.create(dto, user.id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UpdatedStoryResponse> {
    return this.storiesService.update(id, dto, user.id);
  }

  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.storiesService.delete(id, user.id);
    return { message: "스토리가 삭제되었습니다." };
  }

  // ========================
  // AI Generation (인증 필요 - 게스트는 스토리 생성 불가)
  // ========================

  @Post("generate/summary")
  async generateSummary(@Body() dto: GenerateSummaryDto): Promise<GenerateSummaryResponse> {
    return this.storiesService.generateSummary(dto);
  }

  @Post("generate/characters")
  async generateCharacters(
    @Body() dto: GenerateCharactersDto,
  ): Promise<GenerateCharactersResponse> {
    return this.storiesService.generateCharacters(dto);
  }

  @Post("generate/profile-image")
  async generateProfileImage(
    @Body() dto: GenerateProfileImageDto,
  ): Promise<GenerateProfileImageResponse> {
    return this.storiesService.generateProfileImage(dto);
  }

  @Post("generate/cover-image")
  async generateCoverImage(
    @Body() dto: GenerateCoverImageDto,
  ): Promise<GenerateCoverImageResponse> {
    return this.storiesService.generateCoverImage(dto);
  }

  @Post("generate/background-image")
  async generateBackgroundImage(
    @Body() dto: GenerateBackgroundImageDto,
  ): Promise<GenerateBackgroundImageResponse> {
    return this.storiesService.generateBackgroundImage(dto);
  }

  @Post("generate/character-background-image")
  async generateCharacterBackgroundImage(
    @Body() dto: GenerateCharacterBackgroundImageDto,
  ): Promise<GenerateCharacterBackgroundImageResponse> {
    return this.storiesService.generateCharacterBackgroundImage(dto);
  }

  @Post("generate/voice-id")
  async getVoiceId(@Body() dto: GetVoiceIdDto): Promise<GetVoiceIdResponse> {
    return this.storiesService.getVoiceId(dto);
  }

  @Post("generate/tts-sample")
  async generateTTSSample(@Body() dto: TTSSampleDto): Promise<TTSSampleResponse> {
    return this.storiesService.generateTTSSample(dto);
  }

  // ========================
  // Characters
  // ========================

  @Public()
  @Get(":storyId/characters")
  async findCharacters(@Param("storyId") storyId: string): Promise<CharactersListResponse> {
    return this.storiesService.findCharacters(storyId);
  }

  @Post(":storyId/characters")
  async createCharacter(
    @Param("storyId") storyId: string,
    @Body() dto: CreateCharacterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.storiesService.verifyStoryOwnership(storyId, user.id);
    return this.charactersService.create(storyId, dto);
  }
}
