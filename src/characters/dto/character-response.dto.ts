import type { CharacterRole, StoryStatus } from "@prisma/client";

export class CharacterStorySnippet {
  id: string;
  title: string;
  seriesTitle: string | null;
  authorName: string;
  coverColor: string;
  coverImage: string | null;
  status: StoryStatus;
  creatorId: string | null;
}

export class CharacterWithStoryResponse {
  id: string;
  name: string;
  role: CharacterRole;
  description: string;
  imageColor: string;
  profileImage: string | null;
  backgroundImage: string | null;
  backgroundColor: string;
  story: CharacterStorySnippet;
}

export class PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class CharactersListResponse {
  characters: CharacterWithStoryResponse[];
  pagination: PaginationResponse;
}
