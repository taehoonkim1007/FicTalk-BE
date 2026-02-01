export class StoryCategoryResponse {
  id: number;
  name: string;
  slug: string;
}

export class StoryCreatorResponse {
  id: string;
  name: string;
}

export class PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class StoryResponse {
  id: string;
  title: string;
  seriesTitle: string | null;
  authorName: string;
  description: string;
  coverColor: string;
  coverImage: string | null;
  backgroundImage: string | null;
  isOfficial: boolean;
  createdAt: Date;
  category: StoryCategoryResponse;
}

export class StoriesListResponse {
  stories: StoryResponse[];
  pagination: PaginationResponse;
}

export interface VoiceSettingsResponse {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}

export class CharacterResponse {
  id: string;
  name: string;
  role: string;
  description: string;
  imageColor: string;
  profileImage: string | null;
  backgroundImage: string | null;
  backgroundColor: string;
  voiceId: string | null;
  voiceSettings: VoiceSettingsResponse | null;
}

export class StoryDetailResponse extends StoryResponse {
  summary: string;
  creator: StoryCreatorResponse | null;
  characters: CharacterResponse[];
}

export class CreatedStoryResponse {
  id: string;
  title: string;
  seriesTitle: string | null;
  authorName: string;
  description: string;
  summary: string;
  coverColor: string;
  coverImage: string | null;
  backgroundImage: string | null;
  isOfficial: boolean;
  createdAt: Date;
  category: StoryCategoryResponse;
  creator: StoryCreatorResponse;
  characters: CharacterResponse[];
}

export class UpdatedStoryResponse {
  id: string;
  title: string;
  seriesTitle: string | null;
  authorName: string;
  description: string;
  summary: string;
  coverColor: string;
  coverImage: string | null;
  backgroundImage: string | null;
  isOfficial: boolean;
  updatedAt: Date;
}

export class CharacterDetailResponse {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string | null;
  firstMessage: string | null;
  imageColor: string;
  profileImage: string | null;
  backgroundImage: string | null;
  backgroundColor: string;
  voiceId: string | null;
  voiceSettings: VoiceSettingsResponse | null;
  createdAt?: Date;
}

export class CharactersListResponse {
  storyId: string;
  storyTitle: string;
  characters: CharacterDetailResponse[];
}
