-- DropForeignKey
ALTER TABLE "ChatRoomCharacter" DROP CONSTRAINT "ChatRoomCharacter_characterId_fkey";

-- AddForeignKey
ALTER TABLE "ChatRoomCharacter" ADD CONSTRAINT "ChatRoomCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
