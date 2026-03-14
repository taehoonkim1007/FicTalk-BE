import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { CharactersController } from "./characters.controller";
import { CharactersService } from "./characters.service";
import { CharactersRepository } from "./repositories/characters.repository";

@Module({
  imports: [PrismaModule],
  controllers: [CharactersController],
  providers: [CharactersService, CharactersRepository],
  exports: [CharactersService],
})
export class CharactersModule {}
