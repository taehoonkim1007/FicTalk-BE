import { type Server } from "http";
import { type CanActivate, type ExecutionContext, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { type User } from "@prisma/client";
import Redis from "ioredis";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AUTH_CODE_TTL, REDIS_KEY_PREFIX } from "../src/auth/constants";
import { GoogleAuthGuard } from "../src/auth/guards/google-auth.guard";
import { type GoogleAuthRequest } from "../src/auth/types/auth.types";
import { PrismaService } from "../src/prisma/prisma.service";

describe("AuthController (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisClient: Redis;
  let user: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<GoogleAuthRequest>();
          req.user = {
            id: "google-mock-id",
            email: "mock@example.com",
            name: "Mock User",
            picture: "http://mock.com/pic.jpg",
          };
          return true;
        },
      } as CanActivate)
      .compile();

    app = moduleFixture.createNestApplication();

    // Redis 클라이언트 직접 연결 (테스트 데이터 주입용)
    const configService = moduleFixture.get<ConfigService>(ConfigService);
    redisClient = new Redis(configService.getOrThrow<string>("REDIS_URL"));

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Clean DB & Redis
    await prisma.user.deleteMany();
    await redisClient.flushall();

    // Test User Setup
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        googleId: "google-123",
        profileImage: "http://example.com/pic.jpg",
      },
    });
  });

  afterAll(async () => {
    if (prisma) await prisma.user.deleteMany();
    if (redisClient) await redisClient.quit();
    if (app) await app.close();
  });

  // Helper: Redis에 Auth Code 강제 주입
  const injectAuthCode = async (code: string, userId: string) => {
    const key = `${REDIS_KEY_PREFIX.AUTH_CODE}${code}`;
    await redisClient.set(key, userId, "PX", AUTH_CODE_TTL);
  };

  describe("POST /auth/exchange", () => {
    it("유효한 코드로 요청 시 액세스 토큰과 HttpOnly 쿠키를 반환해야 합니다", async () => {
      const code = "valid-test-code";
      await injectAuthCode(code, user.id);

      const response = await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(201);

      // 1. AccessToken Body 검증

      const body = response.body as { accessToken: string };
      expect(body).toHaveProperty("accessToken");
      expect(typeof body.accessToken).toBe("string");

      // 2. Cookie 검증
      const cookies = response.get("Set-Cookie");
      expect(cookies).toBeDefined();

      const refreshTokenCookie = (cookies as string[]).find((c: string) =>
        c.startsWith("refreshToken="),
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain("HttpOnly");
      expect(refreshTokenCookie).toContain("Path=/");
      // 개발 환경에서는 Lax, Secure는 false일 수 있음 (설정에 따라 다름)
    });

    it("코드가 없거나 유효하지 않으면 401을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code: "invalid-code" })
        .expect(401);
    });

    it("이미 사용된(삭제된) 코드로 요청 시 401을 반환해야 합니다 (재사용 방지)", async () => {
      const code = "reuse-test-code";
      await injectAuthCode(code, user.id);

      // 첫 번째 요청: 성공
      await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(201);

      // 두 번째 요청: 실패 (이미 삭제됨)
      await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(401);
    });
  });

  describe("GET /auth/google/callback", () => {
    it("전체 인증 흐름(로그인 콜백 -> 코드 리다이렉트 -> 토큰 교환)을 처리해야 합니다", async () => {
      // 1. GET /auth/google/callback 요청 (Mock Guard가 user 주입)

      const callbackRes = await request(app.getHttpServer() as Server)
        .get("/auth/google/callback")
        .expect(302);

      const location = callbackRes.header.location;
      expect(location).toBeDefined();
      expect(location).toContain("?code=");

      const code = new URL(location).searchParams.get("code");
      expect(code).toBeTruthy();

      // 2. 추출한 코드로 토큰 교환 요청 (POST /auth/exchange)

      const exchangeRes = await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(201);

      // 토큰 검증

      const body = exchangeRes.body as { accessToken: string };
      expect(body).toHaveProperty("accessToken");
      expect(typeof body.accessToken).toBe("string");
    });
  });
});
