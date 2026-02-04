import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatRepository } from "./repositories/chat.repository";
import { GuestChatRepository } from "./repositories/guest-chat.repository";

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, GuestChatRepository],
  exports: [ChatService],
})
export class ChatModule {}
