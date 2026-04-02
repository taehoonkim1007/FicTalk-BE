import { type Request } from "express";

// ========================
// Role 타입
// ========================
export type UserRole = "user" | "guest";

// ========================
// JWT Payload
// ========================
export interface JwtPayload {
  sub: string;
  email: string | null;
  role: UserRole;
}

// ========================
// Guest 관련 타입
// ========================
export interface GuestInfo {
  guestId: string;
  usageCount: number;
  maxUsage: number;
  ipHash: string;
  createdAt: number;
}
// ========================
// 인증된 사용자 타입 (Discriminated Union)
// ========================
interface BaseAuthenticatedUser {
  id: string;
  email: string | null;
}

export interface AuthenticatedRegularUser extends BaseAuthenticatedUser {
  role: "user";
  name: string;
  profileImage: string | null;
}

export interface AuthenticatedGuest extends BaseAuthenticatedUser {
  role: "guest";
  usageCount: number;
  maxUsage: number;
}

export type AuthenticatedUser = AuthenticatedRegularUser | AuthenticatedGuest;

// ========================
// 프로필 수정 타입
// ========================
export interface UpdateProfileData {
  name?: string;
  profileImage?: string;
}

// ========================
// Google OAuth 관련 타입
// ========================
export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface GoogleAuthRequest extends Request {
  user: GoogleProfile;
}

// ========================
// 쿠키 포함 Request 타입
// ========================
export interface RequestWithRefreshToken extends Request {
  cookies: {
    refreshToken?: string;
  };
}
