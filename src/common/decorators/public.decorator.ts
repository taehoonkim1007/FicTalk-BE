import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * 이 데코레이터가 적용된 엔드포인트는 인증 없이 접근 가능합니다.
 * Global JwtAuthGuard와 함께 사용됩니다.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
