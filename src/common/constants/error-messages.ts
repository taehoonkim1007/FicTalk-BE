import { type ErrorCode } from "./error-codes";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Validation
  VALIDATION_ERROR: "입력값이 올바르지 않습니다.",

  // Auth
  AUTH_INVALID_TOKEN: "유효하지 않은 토큰입니다.",
  AUTH_EXPIRED_TOKEN: "만료된 토큰입니다.",
  GUEST_NOT_ALLOWED: "게스트는 접근할 수 없습니다.",
  TOKEN_INVALID: "인증이 필요합니다.",

  // User
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",

  // Common
  BAD_REQUEST: "잘못된 요청입니다.",
  NOT_FOUND: "리소스를 찾을 수 없습니다.",
  CONFLICT: "요청이 현재 상태와 충돌합니다.",
  INTERNAL_SERVER_ERROR: "서버 오류가 발생했습니다.",
};
