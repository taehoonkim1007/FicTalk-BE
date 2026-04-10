import { type ErrorCode } from "./error-codes";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Validation
  VALIDATION_ERROR: "입력값이 올바르지 않습니다.",

  // Auth
  AUTH_INVALID_TOKEN: "유효하지 않은 토큰입니다.",
  AUTH_EXPIRED_TOKEN: "만료된 토큰입니다.",
  GUEST_NOT_ALLOWED: "게스트는 접근할 수 없습니다.",
  GUEST_CHARACTER_LIMIT: "게스트는 캐릭터를 1개만 추가할 수 있습니다.",
  GUEST_USAGE_LIMIT: "게스트 사용량 한도를 초과했습니다.",
  TOKEN_INVALID: "인증이 필요합니다.",

  // User
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",

  // Story
  STORY_NOT_FOUND: "스토리를 찾을 수 없습니다.",
  STORY_NOT_OWNER: "본인의 스토리만 수정/삭제할 수 있습니다.",
  STORY_NOT_PUBLISHED: "비공개된 스토리에는 접근할 수 없습니다.",
  STORY_PUBLISH_NO_CHARACTER: "캐릭터가 1명 이상 있어야 게시할 수 있습니다.",
  STORY_ALREADY_PUBLISHED: "이미 게시된 스토리입니다.",
  CATEGORY_NOT_FOUND: "카테고리를 찾을 수 없습니다.",
  CHARACTER_NOT_FOUND: "캐릭터를 찾을 수 없습니다.",

  // Chat
  CHAT_ROOM_NOT_FOUND: "채팅방을 찾을 수 없습니다.",
  CHAT_CHARACTER_NOT_FOUND: "해당 캐릭터와의 대화를 찾을 수 없습니다.",

  // Common
  BAD_REQUEST: "잘못된 요청입니다.",
  NOT_FOUND: "리소스를 찾을 수 없습니다.",
  CONFLICT: "요청이 현재 상태와 충돌합니다.",
  INTERNAL_SERVER_ERROR: "서버 오류가 발생했습니다.",
};
