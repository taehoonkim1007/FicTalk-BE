import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AiService } from "./ai.service";

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.getOrThrow<string>("AI_SERVER_URL"),
        timeout: 180000, // 이미지 생성 시간 고려 (180초)
      }),
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
