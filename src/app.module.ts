import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import * as Joi from "joi";

import { AiModule } from "./ai/ai.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { CategoriesModule } from "./categories/categories.module";
import { CharactersModule } from "./characters/characters.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { FileStorageModule } from "./common/services/file-storage.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { StoriesModule } from "./stories/stories.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
        FRONTEND_URL: Joi.string().required(),
        AI_SERVER_URL: Joi.string().required(),
      }),
    }),
    PrismaModule,
    RedisModule,
    FileStorageModule,
    AiModule,
    AuthModule,
    CategoriesModule,
    CharactersModule,
    StoriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
