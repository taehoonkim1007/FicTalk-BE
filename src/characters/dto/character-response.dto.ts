export class CharacterStorySnippet {
  id: string;
  title: string;
  authorName: string;
  coverColor: string;
  coverImage: string | null;
}

export class CharacterWithStoryResponse {
  id: string;
  name: string;
  role: string;
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
