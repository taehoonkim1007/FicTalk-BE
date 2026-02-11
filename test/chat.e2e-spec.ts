import { type Server } from "http";
import {
  ValidationPipe,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { type Category, type Character, type Story } from "@prisma/client";
import Redis from "ioredis";
import request from "supertest";

import { AiService } from "../src/ai/ai.service";
import { AppModule } from "../src/app.module";
import { GoogleAuthGuard } from "../src/auth/guards/google-auth.guard";
import { type GoogleAuthRequest } from "../src/auth/types/auth.types";
import { PrismaService } from "../src/prisma/prisma.service";

interface ChatCharacterListResponse {
  characters: Array<{ id: string; name: string }>;
}

interface ChatMessageListResponse {
  messages: Array<{ id: string; content: string; role: string }>;
}

interface SendMessageApiResponse {
  userMessage: { id: string; content: string; role: string };
  aiMessage: { id: string; content: string; role: string };
}

describe("ChatController (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisClient: Redis;
  let accessToken: string;
  let category: Category;
  let story: Story;
  let character: Character;

  // Mock User 정보
  const mockUser = {
    id: "google-chat-user",
    email: "chat-test@example.com",
    name: "Chat Test User",
    picture: "http://mock.com/pic.jpg",
  };

  // AI 서비스 Mock
  const mockAiService = {
    generateChatResponse: jest.fn().mockResolvedValue("안녕하세요! 반갑습니다."),
    processStoryEmbedding: jest.fn().mockResolvedValue(0),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<GoogleAuthRequest>();
          req.user = mockUser;
          return true;
        },
      } as CanActivate)
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const configService = moduleFixture.get<ConfigService>(ConfigService);
    redisClient = new Redis(configService.getOrThrow<string>("REDIS_URL"));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // 1. 카테고리 확인/생성
    category = (await prisma.category.findFirst()) as Category;
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "테스트 카테고리",
          slug: "test-category",
        },
      });
    }

    // 2. 로그인 및 토큰 발급
    const callbackRes = await request(app.getHttpServer() as Server)
      .get("/auth/google/callback")
      .expect(302);

    const code = new URL(callbackRes.header.location).searchParams.get("code");

    const exchangeRes = await request(app.getHttpServer() as Server)
      .post("/auth/exchange")
      .send({ code })
      .expect(201);

    accessToken = (exchangeRes.body as { accessToken: string }).accessToken;

    // 3. 테스트용 스토리/캐릭터 생성
    const storyRes = await request(app.getHttpServer() as Server)
      .post("/stories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "테스트 스토리",
        authorName: "테스트 작가",
        categorySlug: category.slug,
        description: "테스트 설명",
        summary: "테스트 줄거리",
        characters: [
          {
            name: "테스트 캐릭터",
            role: "주인공",
            description: "테스트 캐릭터 설명",
            personality: "친절한",
            firstMessage: "안녕하세요!",
          },
        ],
      })
      .expect(201);

    story = storyRes.body as Story;
    character = (storyRes.body as { characters: Character[] }).characters[0];
  });

  afterAll(async () => {
    if (prisma && story) {
      // ChatRoomCharacter는 ChatRoom 삭제 시 cascade 삭제됨
      await prisma.chatMessage.deleteMany();
      await prisma.chatRoom.deleteMany();
      await prisma.character.deleteMany({ where: { storyId: story.id } });
      await prisma.story.deleteMany({ where: { id: story.id } });
    }
    if (redisClient) await redisClient.quit();
    if (app) await app.close();
  });

  describe("GET /chat", () => {
    it("채팅방을 조회/생성해야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .get("/chat")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
    });
  });

  describe("GET /chat/characters", () => {
    it("채팅 캐릭터 목록을 반환해야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .get("/chat/characters")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as ChatCharacterListResponse;
      expect(body).toHaveProperty("characters");
      expect(Array.isArray(body.characters)).toBe(true);
    });
  });

  describe("POST /chat/characters", () => {
    it("캐릭터를 채팅방에 추가해야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .post("/chat/characters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ characterId: character.id })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", character.name);
    });

    it("characterId가 없으면 400을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .post("/chat/characters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("GET /chat/characters/:characterId/messages", () => {
    it("메시지 목록을 반환해야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .get(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as ChatMessageListResponse;
      expect(body).toHaveProperty("messages");
      expect(Array.isArray(body.messages)).toBe(true);
    });
  });

  describe("DELETE /chat/characters/:characterId", () => {
    it("캐릭터를 채팅방에서 제거해야 합니다", async () => {
      // 먼저 캐릭터 추가
      await request(app.getHttpServer() as Server)
        .post("/chat/characters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ characterId: character.id });

      const response = await request(app.getHttpServer() as Server)
        .delete(`/chat/characters/${character.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("POST /chat/characters/:characterId/messages", () => {
    beforeEach(async () => {
      // 메시지 테스트 전 캐릭터 추가
      await request(app.getHttpServer() as Server)
        .post("/chat/characters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ characterId: character.id });
    });

    it("메시지를 전송하고 AI 응답을 받아야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .post(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ content: "안녕하세요" })
        .expect(201);

      const body = response.body as SendMessageApiResponse;
      expect(body).toHaveProperty("userMessage");
      expect(body).toHaveProperty("aiMessage");
      expect(body.userMessage).toHaveProperty("content", "안녕하세요");
      expect(body.aiMessage).toHaveProperty("content");
      expect(mockAiService.generateChatResponse).toHaveBeenCalled();
    });

    it("content가 없으면 400을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .post(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it("빈 content는 400을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .post(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ content: "" })
        .expect(400);
    });
  });

  describe("DELETE /chat/characters/:characterId/messages", () => {
    beforeEach(async () => {
      // 캐릭터 추가 및 메시지 생성
      await request(app.getHttpServer() as Server)
        .post("/chat/characters")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ characterId: character.id });

      await request(app.getHttpServer() as Server)
        .post(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ content: "테스트 메시지" });
    });

    it("대화를 초기화해야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .delete(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("message");

      // 초기화 후 메시지 조회 시 빈 배열
      const messagesRes = await request(app.getHttpServer() as Server)
        .get(`/chat/characters/${character.id}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const messagesBody = messagesRes.body as ChatMessageListResponse;
      expect(messagesBody.messages).toEqual([]);
    });
  });
});
