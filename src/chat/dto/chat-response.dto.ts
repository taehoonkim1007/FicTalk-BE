// 채팅방 응답
export class ChatRoomResponse {
  id: string;
  createdAt: Date;
}

// Voice 설정
export interface VoiceSettingsResponse {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}

// 채팅방 캐릭터 응답
export class ChatCharacterResponse {
  id: string;
  name: string;
  role: string;
  description: string;
  profileImage: string | null;
  backgroundImage: string | null;
  imageColor: string;
  personality: string | null;
  firstMessage: string | null;
  voiceId: string | null;
  voiceSettings: VoiceSettingsResponse | null;
  story: {
    id: string;
    title: string;
    backgroundImage: string | null;
  };
}

export class ChatCharactersResponse {
  characters: ChatCharacterResponse[];
}

// 메시지 응답
export class ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export class ChatMessagesResponse {
  messages: ChatMessageResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

// 메시지 전송 응답
export class SendMessageResponse {
  userMessage: ChatMessageResponse;
  aiMessage: ChatMessageResponse;
}
