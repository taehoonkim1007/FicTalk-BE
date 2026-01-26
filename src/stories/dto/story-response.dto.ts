export interface StoryResponse {
  id: string;
  title: string;
  authorName: string;
  description: string;
  coverColor: string;
  isOfficial: boolean;
  createdAt: Date;
  category: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface StoriesListResponse {
  stories: StoryResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StoryDetailResponse extends StoryResponse {
  summary: string;
  creator: {
    id: string;
    name: string;
  } | null;
  characters: CharacterResponse[];
}

export interface CharacterResponse {
  id: string;
  name: string;
  role: string;
  description: string;
  imageColor: string;
}

export interface CreatedStoryResponse {
  id: string;
  title: string;
  authorName: string;
  description: string;
  summary: string;
  coverColor: string;
  isOfficial: boolean;
  createdAt: Date;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  creator: {
    id: string;
    name: string;
  };
  characters: CharacterResponse[];
}

export interface UpdatedStoryResponse {
  id: string;
  title: string;
  authorName: string;
  description: string;
  summary: string;
  coverColor: string;
  isOfficial: boolean;
  updatedAt: Date;
}

export interface CharactersListResponse {
  storyId: string;
  storyTitle: string;
  characters: CharacterDetailResponse[];
}

export interface CharacterDetailResponse {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string | null;
  firstMessage: string | null;
  imageColor: string;
  createdAt?: Date;
}
