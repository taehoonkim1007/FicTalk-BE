import { type Server } from "http";
import {
  ValidationPipe,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import Redis from "ioredis";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { GoogleAuthGuard } from "../src/auth/guards/google-auth.guard";
import { type GoogleAuthRequest } from "../src/auth/types/auth.types";
import { PrismaService } from "../src/prisma/prisma.service";

describe("StoriesController (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisClient: Redis;
  let accessToken: string;
  let createdStoryId: string;

  // Mock User 정보
  const mockUser = {
    id: "google-mock-id",
    email: "test-story-user@example.com",
    name: "Story Tester",
    picture: "http://mock.com/pic.jpg",
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
      .compile();

    app = moduleFixture.createNestApplication();

    // 실제 앱과 동일한 파이프 설정 적용
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    const configService = moduleFixture.get<ConfigService>(ConfigService);
    redisClient = new Redis(configService.getOrThrow<string>("REDIS_URL"));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // 1. DB Clean
    await prisma.story.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany(); // 카테고리도 정리

    // 2. 카테고리 생성 (테스트용)
    await prisma.category.create({
      data: {
        name: "World Literature",
        slug: "world-lit",
        order: 1,
      },
    });

    // 3. 로그인 및 토큰 발급
    // 2-1. 콜백 요청 (코드 생성)
    const callbackRes = await request(app.getHttpServer() as Server)
      .get("/auth/google/callback")
      .expect(302);

    const code = new URL(callbackRes.header.location).searchParams.get("code");

    // 2-2. 토큰 교환
    const exchangeRes = await request(app.getHttpServer() as Server)
      .post("/auth/exchange")
      .send({ code })
      .expect(201);

    const body = exchangeRes.body as { accessToken: string };
    accessToken = body.accessToken;
  });

  afterAll(async () => {
    if (prisma) await prisma.story.deleteMany();
    if (prisma) await prisma.user.deleteMany();
    if (redisClient) await redisClient.quit();
    if (app) await app.close();
  });

  // ==========================================
  // 1. 스토리 생성 (POST /stories)
  // ==========================================
  it("유효한 데이터로 스토리 생성 시 201 상태코드와 생성된 정보를 반환해야 한다", async () => {
    const createDto = {
      title: "E2E 테스트 스토리",
      authorName: "테스터",
      categorySlug: "world-lit",
      description: "테스트 설명",
      summary: "테스트 줄거리",
      characters: [
        {
          name: "주인공",
          role: "주인공",
          description: "Desc",
          personality: "Personality",
          firstMessage: "Hi",
        },
      ],
    };

    const response = await request(app.getHttpServer() as Server)
      .post("/stories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(createDto)
      .expect(201);

    const body = response.body as { id: string; title: string };
    expect(body).toHaveProperty("id");
    expect(body.title).toBe(createDto.title);

    createdStoryId = body.id;
  });

  // ==========================================
  // 2. 스토리 목록 조회 (GET /stories)
  // ==========================================
  it("스토리 목록 조회 시 방금 생성한 스토리가 포함되어야 한다", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get("/stories")
      .expect(200);

    // 응답은 { stories: [...], pagination: { ... } } 구조임
    const body = response.body as { stories: { id: string; title: string }[] };
    expect(body.stories).toBeInstanceOf(Array);
    const found = body.stories.find((s) => s.id === createdStoryId);
    expect(found).toBeDefined();
    expect(found?.title).toBe("E2E 테스트 스토리");
  });

  // ==========================================
  // 3. 내 스토리 목록 조회 (GET /stories/me)
  // ==========================================
  it("내 스토리 조회 시 작성한 스토리가 반환되어야 한다", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get("/stories/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as { id: string }[];
    expect(body).toBeInstanceOf(Array);
    const found = body.find((s) => s.id === createdStoryId);
    expect(found).toBeDefined();
    expect(found?.id).toBe(createdStoryId);
  });

  // ==========================================
  // 4. 내 스토리 수정 (PATCH /stories/:id)
  // ==========================================
  it("본인의 스토리를 수정하면 제목이 변경되어야 한다", async () => {
    const updateDto = { title: "수정된 E2E 스토리" };

    const response = await request(app.getHttpServer() as Server)
      .patch(`/stories/${createdStoryId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(updateDto)
      .expect(200);

    const body = response.body as { title: string };
    expect(body.title).toBe(updateDto.title);
  });

  // ==========================================
  // 5. 스토리 상세 조회 (GET /stories/:id)
  // ==========================================
  it("스토리 상세 조회 시 캐릭터 정보를 포함해야 한다", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get(`/stories/${createdStoryId}`)
      .expect(200);

    const body = response.body as {
      id: string;
      title: string;
      characters: { name: string }[];
    };
    expect(body.id).toBe(createdStoryId);
    expect(body).toHaveProperty("characters");
    expect(Array.isArray(body.characters)).toBe(true);
  });

  // ==========================================
  // 6. 히어로 슬라이드 조회 (GET /stories/hero-slides)
  // ==========================================
  it("히어로 슬라이드를 조회할 수 있어야 한다 (Public)", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get("/stories/hero-slides")
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  // ==========================================
  // 7. 스토리 캐릭터 목록 조회 (GET /stories/:storyId/characters)
  // ==========================================
  it("스토리의 캐릭터 목록을 조회할 수 있어야 한다 (Public)", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get(`/stories/${createdStoryId}/characters`)
      .expect(200);

    const body = response.body as { characters: { name: string }[] };
    expect(body).toHaveProperty("characters");
    expect(Array.isArray(body.characters)).toBe(true);
  });

  // ==========================================
  // 8. 스토리 삭제 (DELETE /stories/:id)
  // ==========================================
  it("스토리를 삭제하면 200 상태코드를 반환하고, 다시 조회 시 404가 되어야 한다", async () => {
    // 1. 삭제 요청
    await request(app.getHttpServer() as Server)
      .delete(`/stories/${createdStoryId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    // 2. 조회 요청 -> 404 예상
    await request(app.getHttpServer() as Server)
      .get(`/stories/${createdStoryId}`)
      .expect(404);
  });
});
