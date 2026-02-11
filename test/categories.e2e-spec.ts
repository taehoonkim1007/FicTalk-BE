import { type Server } from "http";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
}

describe("CategoriesController (E2E)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe("GET /categories", () => {
    it("카테고리 목록을 반환해야 합니다 (Public)", async () => {
      const response = await request(app.getHttpServer() as Server)
        .get("/categories")
        .expect(200);

      const categories = response.body as CategoryResponse[];
      expect(Array.isArray(categories)).toBe(true);

      if (categories.length > 0) {
        const category = categories[0];
        expect(category).toHaveProperty("id");
        expect(category).toHaveProperty("name");
        expect(category).toHaveProperty("slug");
      }
    });

    it("인증 없이도 접근 가능해야 합니다", async () => {
      await request(app.getHttpServer() as Server)
        .get("/categories")
        .expect(200);
    });
  });
});
