export interface GenerateChatResponseDto {
  characterName: string;
  characterRole: string;
  characterPersonality: string;
  storyTitle: string;
  storySummary: string;
  messages: Array<{ role: string; content: string }>;
  userMessage: string;
}

export interface GenerateChatResponseResponse {
  response: string;
}
