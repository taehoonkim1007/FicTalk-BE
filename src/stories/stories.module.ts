import { Module } from "@nestjs/common";

import { CharactersModule } from "../characters/characters.module";
import { PrismaModule } from "../prisma/prisma.module";
import { StoriesRepository } from "./repositories/stories.repository";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";

@Module({
  imports: [PrismaModule, CharactersModule],
  controllers: [StoriesController],
  providers: [StoriesService, StoriesRepository],
  exports: [StoriesService],
})
export class StoriesModule {}
