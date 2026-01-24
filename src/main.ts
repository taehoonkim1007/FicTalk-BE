import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { type NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

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
