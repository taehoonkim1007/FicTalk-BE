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

describe("CharactersController (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisClient: Redis;
  let accessToken: string;
  let storyId: string; // 테스트용 부모 스토리 ID
  let createdCharacterId: string;

  // Mock User
  const mockUser = {
    id: "google-mock-char-user",
    email: "char-test@example.com",
    name: "Character Tester",
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const configService = moduleFixture.get<ConfigService>(ConfigService);
    redisClient = new Redis(configService.getOrThrow<string>("REDIS_URL"));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // 1. DB 정리
    await prisma.character.deleteMany();
    await prisma.story.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();

    // 2. 카테고리 생성
    await prisma.category.create({
      data: { name: "Test Category", slug: "test-cat", order: 1 },
    });

    // 3. 로그인 및 토큰 발급
    const callbackRes = await request(app.getHttpServer() as Server)
      .get("/auth/google/callback")
      .expect(302);
    const code = new URL(callbackRes.header.location).searchParams.get("code");
    const exchangeRes = await request(app.getHttpServer() as Server)
      .post("/auth/exchange")
      .send({ code })
      .expect(201);

    accessToken = (exchangeRes.body as { accessToken: string }).accessToken;

    // 4. 부모 스토리 생성 (캐릭터 테스트를 위해 필수)
    const storyRes = await request(app.getHttpServer() as Server)
      .post("/stories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Parent Story",
        authorName: "Tester",
        categorySlug: "test-cat",
        description: "Desc",
        summary: "Summary",
      })
      .expect(201);

    storyId = (storyRes.body as { id: string }).id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.character.deleteMany();
      await prisma.story.deleteMany();
      await prisma.user.deleteMany();
      await prisma.category.deleteMany();
    }
    if (redisClient) await redisClient.quit();
    if (app) await app.close();
  });

  // ==========================================
  // 1. 캐릭터 생성 (POST /stories/:id/characters)
  // ==========================================
  it("스토리에 새로운 캐릭터를 추가하면 201 상태코드와 생성된 정보를 반환해야 한다", async () => {
    const createDto = {
      name: "New Character",
      role: "Villain",
      description: "Evil genius",
      personality: "Smart but cruel",
      firstMessage: "I expect you to die.",
    };

    const response = await request(app.getHttpServer() as Server)
      .post(`/stories/${storyId}/characters`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(createDto)
      .expect(201);

    const body = response.body as { id: string; name: string };
    expect(body).toHaveProperty("id");
    expect(body.name).toBe(createDto.name);

    createdCharacterId = body.id;
  });

  // ==========================================
  // 2. 캐릭터 수정 (PATCH /characters/:id)
  // ==========================================
  it("캐릭터 정보를 수정하면 변경된 내용이 반영되어야 한다", async () => {
    const updateDto = { name: "Redeemed Character", role: "Hero" };

    const response = await request(app.getHttpServer() as Server)
      .patch(`/characters/${createdCharacterId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(updateDto)
      .expect(200);

    const body = response.body as { name: string; role: string };
    expect(body.name).toBe(updateDto.name);
    expect(body.role).toBe(updateDto.role);
  });

  // ==========================================
  // 3. 캐릭터 삭제 (DELETE /characters/:id)
  // ==========================================
  it("캐릭터를 삭제하면 200 상태코드를 반환해야 한다", async () => {
    await request(app.getHttpServer() as Server)
      .delete(`/characters/${createdCharacterId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    // 삭제 확인: 실제로 DB에서 사라졌는지 확인
    const deletedChar = await prisma.character.findUnique({
      where: { id: createdCharacterId },
    });
    expect(deletedChar).toBeNull();
  });
});
