// ========================
// 토큰 만료 시간
// ========================
const REFRESH_EXPIRES_DAYS = 7;

export const JWT_EXPIRES = {
  ACCESS: "1h",
  REFRESH: `${REFRESH_EXPIRES_DAYS}d`,
  GUEST: `${REFRESH_EXPIRES_DAYS}d`,
} as const;

export const REFRESH_TOKEN_TTL = REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000; // in milliseconds (PX)
export const AUTH_CODE_TTL = 30 * 1000; // 30초 (PX 기준)

// ========================
// Guest 설정
// ========================
export const GUEST_CONFIG = {
  MAX_USAGE: 3,
  TTL_DAYS: 7,
  IP_LIMIT: 5,
  ACCESS_EXPIRES: "1h",
  TTL_MS: 7 * 24 * 60 * 60 * 1000, // in milliseconds (PX)
} as const;

// ========================
// Redis 키 접두사
// ========================
export const REDIS_KEY_PREFIX = {
  USER: {
    REFRESH_TOKEN: "user:refresh_token:",
  },
  GUEST: {
    USAGE: "guest:usage:",
    IP_LIMIT: "guest:ip_limit:",
  },
  AUTH_CODE: "auth_code:",
} as const;
