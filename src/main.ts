import { join } from "path";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { type NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import * as express from "express";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Cookie Parser
  app.use(cookieParser());

  // JSON body 크기 제한 증가 (이미지 base64 처리용)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // 정적 파일 서빙 설정 (dist/src/main.js 기준 → ../../public/uploads)
  app.useStaticAssets(join(__dirname, "../..", "public/uploads"), {
    prefix: "/uploads",
  });

  // 프록시 서버 신뢰 설정
  app.set("trust proxy", 1);

  // CORS
  app.enableCors({
    origin: configService.get<string>("FRONTEND_URL"),
    credentials: true,
  });

  // Global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  const port = configService.get<number>("PORT") || 3000;
  await app.listen(port);
};

bootstrap().catch(() => {
  process.exit(1);
});
