import { HttpService } from "@nestjs/axios";
import { Test, type TestingModule } from "@nestjs/testing";
import { of } from "rxjs";

import { AiService } from "./ai.service";

describe("AiService", () => {
  let service: AiService;

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService, { provide: HttpService, useValue: mockHttpService }],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateSummary", () => {
    it("AI 서버에 요청하고 응답을 반환한다", async () => {
      const dto = { title: "테스트", description: "설명" };
      const mockResponse = { data: { summary: "생성된 줄거리" } };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateSummary(dto);

      expect(mockHttpService.post).toHaveBeenCalledWith("/api/story-generation/summary", dto);
      expect(result).toEqual({ summary: "생성된 줄거리" });
    });
  });

  describe("generateCharacters", () => {
    it("AI 서버에 요청하고 캐릭터 목록을 반환한다", async () => {
      const dto = { title: "테스트", description: "설명", summary: "줄거리" };
      const mockResponse = {
        data: { characters: [{ name: "캐릭터1", role: "주인공" }] },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateCharacters(dto);

      expect(mockHttpService.post).toHaveBeenCalledWith("/api/story-generation/characters", dto);
      expect(result.characters).toHaveLength(1);
    });
  });

  describe("generateProfileImage", () => {
    it("snake_case 응답을 camelCase로 변환한다", async () => {
      const dto = { description: "설명", personality: "성격" };
      const mockResponse = {
        data: { image_base64: "base64data", prompt_used: "프롬프트" },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateProfileImage(dto);

      expect(result).toEqual({
        imageBase64: "base64data",
        promptUsed: "프롬프트",
      });
    });
  });

  describe("generateCoverImage", () => {
    it("snake_case 응답을 camelCase로 변환한다", async () => {
      const dto = { title: "제목", description: "설명", summary: "줄거리" };
      const mockResponse = {
        data: { image_base64: "base64data", prompt_used: "프롬프트" },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateCoverImage(dto);

      expect(result).toEqual({
        imageBase64: "base64data",
        promptUsed: "프롬프트",
      });
    });
  });

  describe("generateBackgroundImage", () => {
    it("snake_case 응답을 camelCase로 변환한다", async () => {
      const dto = { title: "제목", description: "설명", summary: "줄거리" };
      const mockResponse = {
        data: { image_base64: "base64data", prompt_used: "프롬프트" },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateBackgroundImage(dto);

      expect(result).toEqual({
        imageBase64: "base64data",
        promptUsed: "프롬프트",
      });
    });
  });

  describe("generateCharacterBackgroundImage", () => {
    it("snake_case 응답을 camelCase로 변환한다", async () => {
      const dto = { description: "설명", personality: "성격" };
      const mockResponse = {
        data: { image_base64: "base64data", prompt_used: "프롬프트" },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateCharacterBackgroundImage(dto);

      expect(result).toEqual({
        imageBase64: "base64data",
        promptUsed: "프롬프트",
      });
    });
  });

  describe("generateChatResponse", () => {
    it("camelCase를 snake_case로 변환하여 요청한다", async () => {
      const dto = {
        characterName: "캐릭터",
        characterRole: "주인공",
        characterPersonality: "성격",
        storyId: "story-1",
        storyTitle: "제목",
        storySummary: "줄거리",
        messages: [],
        userMessage: "안녕",
      };
      const mockResponse = { data: { response: "AI 응답" } };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateChatResponse(dto);

      expect(mockHttpService.post).toHaveBeenCalledWith("/api/chat/response", {
        character_name: "캐릭터",
        character_role: "주인공",
        character_personality: "성격",
        story_id: "story-1",
        story_title: "제목",
        story_summary: "줄거리",
        messages: [],
        user_message: "안녕",
      });
      expect(result).toBe("AI 응답");
    });
  });

  describe("processStoryEmbedding", () => {
    it("임베딩 청크 수를 반환한다", async () => {
      const mockResponse = {
        data: { story_id: "story-1", chunk_count: 5, message: "완료" },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.processStoryEmbedding("story-1", "줄거리");

      expect(mockHttpService.post).toHaveBeenCalledWith("/api/embeddings/story", {
        story_id: "story-1",
        summary: "줄거리",
      });
      expect(result).toBe(5);
    });
  });

  describe("getVoiceId", () => {
    it("snake_case 응답을 camelCase로 변환한다", async () => {
      const dto = { description: "설명", personality: "성격" };
      const mockResponse = {
        data: {
          voice_id: "voice-1",
          voice_name: "음성",
          attributes: { gender: "male", age: "young", accent: "korean", tone: [], keywords: [] },
          voice_settings: { stability: 0.5, similarity_boost: 0.7, style: 0.5, speed: 1.0 },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.getVoiceId(dto);

      expect(result).toEqual({
        voiceId: "voice-1",
        voiceName: "음성",
        attributes: { gender: "male", age: "young", accent: "korean", tone: [], keywords: [] },
        voiceSettings: { stability: 0.5, similarityBoost: 0.7, style: 0.5, speed: 1.0 },
      });
    });
  });

  describe("generateTTSSample", () => {
    it("voiceSettings 없이 요청한다", async () => {
      const dto = { voiceId: "voice-1", text: "안녕하세요" };
      const mockResponse = { data: { audio_base64: "audiodata" } };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.generateTTSSample(dto);

      expect(mockHttpService.post).toHaveBeenCalledWith("/api/tts/sample", {
        voice_id: "voice-1",
        text: "안녕하세요",
      });
      expect(result).toEqual({ audioBase64: "audiodata" });
    });

    it("voiceSettings를 snake_case로 변환하여 요청한다", async () => {
      const dto = {
        voiceId: "voice-1",
        text: "안녕하세요",
        voiceSettings: { stability: 0.5, similarityBoost: 0.7, style: 0.5, speed: 1.0 },
      };
      const mockResponse = { data: { audio_base64: "audiodata" } };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.generateTTSSample(dto);

      expect(mockHttpService.post).toHaveBeenCalledWith("/api/tts/sample", {
        voice_id: "voice-1",
        text: "안녕하세요",
        voice_settings: { stability: 0.5, similarity_boost: 0.7, style: 0.5, speed: 1.0 },
      });
    });
  });
});
