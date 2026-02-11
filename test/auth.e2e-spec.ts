import { type Server } from "http";
import { type CanActivate, type ExecutionContext, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { type User } from "@prisma/client";
import cookieParser from "cookie-parser";
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
    app.use(cookieParser());

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

  describe("POST /auth/guest", () => {
    it("새로운 게스트 토큰을 발급해야 합니다", async () => {
      const response = await request(app.getHttpServer() as Server)
        .post("/auth/guest")
        .send({})
        .expect(201);

      const body = response.body as {
        accessToken: string;
        guestId: string;
        usageCount: number;
        maxUsage: number;
      };

      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("guestId");
      expect(body).toHaveProperty("usageCount", 0);
      expect(body).toHaveProperty("maxUsage");
      expect(typeof body.accessToken).toBe("string");
      expect(typeof body.guestId).toBe("string");
    });

    it("기존 guestId로 토큰을 갱신해야 합니다", async () => {
      // 1. 먼저 게스트 토큰 생성
      const createRes = await request(app.getHttpServer() as Server)
        .post("/auth/guest")
        .send({})
        .expect(201);

      const { guestId } = createRes.body as { guestId: string };

      // 2. 같은 guestId로 갱신 요청
      const refreshRes = await request(app.getHttpServer() as Server)
        .post("/auth/guest")
        .send({ guestId })
        .expect(201);

      const body = refreshRes.body as { guestId: string; accessToken: string };

      expect(body.guestId).toBe(guestId);
      expect(body).toHaveProperty("accessToken");
    });

    it("존재하지 않는 guestId는 401을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .post("/auth/guest")
        .send({ guestId: "invalid-guest-id" })
        .expect(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("유효한 refreshToken 쿠키로 새 토큰을 받아야 합니다", async () => {
      // 1. 먼저 로그인해서 refreshToken 쿠키 받기
      const callbackRes = await request(app.getHttpServer() as Server)
        .get("/auth/google/callback")
        .expect(302);

      const code = new URL(callbackRes.header.location).searchParams.get("code");

      const exchangeRes = await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(201);

      const cookies = exchangeRes.get("Set-Cookie") as string[];
      const refreshTokenCookie = cookies.find((c) => c.startsWith("refreshToken="));

      // 2. refresh 요청
      const refreshRes = await request(app.getHttpServer() as Server)
        .post("/auth/refresh")
        .set("Cookie", refreshTokenCookie as string)
        .expect(201);

      const body = refreshRes.body as { accessToken: string };
      expect(body).toHaveProperty("accessToken");
      expect(typeof body.accessToken).toBe("string");
    });

    it("refreshToken 쿠키가 없으면 401을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .post("/auth/refresh")
        .expect(401);
    });
  });

  describe("GET /auth/me", () => {
    it("인증된 사용자 정보를 반환해야 합니다", async () => {
      // 1. 로그인
      const callbackRes = await request(app.getHttpServer() as Server)
        .get("/auth/google/callback")
        .expect(302);

      const code = new URL(callbackRes.header.location).searchParams.get("code");

      const exchangeRes = await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(201);

      const { accessToken } = exchangeRes.body as { accessToken: string };

      // 2. /auth/me 요청
      const meRes = await request(app.getHttpServer() as Server)
        .get("/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = meRes.body as { id: string; email: string; role: string };
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("email");
      expect(body).toHaveProperty("role", "user");
    });

    it("게스트 사용자 정보를 반환해야 합니다", async () => {
      // 1. 게스트 토큰 발급
      const guestRes = await request(app.getHttpServer() as Server)
        .post("/auth/guest")
        .send({})
        .expect(201);

      const { accessToken } = guestRes.body as { accessToken: string };

      // 2. /auth/me 요청
      const meRes = await request(app.getHttpServer() as Server)
        .get("/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = meRes.body as {
        id: string;
        role: string;
        email: string | null;
        usageCount: number;
        maxUsage: number;
      };
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("role", "guest");
      expect(body).toHaveProperty("usageCount");
      expect(body).toHaveProperty("maxUsage");
      expect(body.email).toBeNull();
    });

    it("토큰이 없으면 401을 반환해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .get("/auth/me")
        .expect(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("로그아웃하고 쿠키를 제거해야 합니다", async () => {
      // 1. 로그인
      const callbackRes = await request(app.getHttpServer() as Server)
        .get("/auth/google/callback")
        .expect(302);

      const code = new URL(callbackRes.header.location).searchParams.get("code");

      const exchangeRes = await request(app.getHttpServer() as Server)
        .post("/auth/exchange")
        .send({ code })
        .expect(201);

      const { accessToken } = exchangeRes.body as { accessToken: string };
      const cookies = exchangeRes.get("Set-Cookie") as string[];
      const refreshTokenCookie = cookies.find((c) => c.startsWith("refreshToken="));

      // 2. 로그아웃
      const logoutRes = await request(app.getHttpServer() as Server)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Cookie", refreshTokenCookie as string)
        .expect(201);

      expect(logoutRes.body).toHaveProperty("message");

      // 3. 로그아웃 후 refreshToken 쿠키가 제거되었는지 확인
      const logoutCookies = logoutRes.get("Set-Cookie") as string[];
      const clearedCookie = logoutCookies?.find((c) => c.startsWith("refreshToken="));
      if (clearedCookie) {
        // 쿠키가 만료되었거나 빈 값으로 설정되어야 함
        expect(
          clearedCookie.includes("Max-Age=0") ||
            clearedCookie.includes("Expires=") ||
            clearedCookie.includes("refreshToken=;"),
        ).toBe(true);
      }
    });
  });
});
