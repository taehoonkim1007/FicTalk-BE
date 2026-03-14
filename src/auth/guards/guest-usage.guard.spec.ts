import { createMock } from "@golevelup/ts-jest";
import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import type { AuthenticatedGuest, AuthenticatedRegularUser } from "../types/auth.types";
import { GuestUsageGuard } from "./guest-usage.guard";

describe("GuestUsageGuard", () => {
  let guard: GuestUsageGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuestUsageGuard],
    }).compile();

    guard = module.get<GuestUsageGuard>(GuestUsageGuard);
  });

  it("가드가 정의되어 있어야 합니다", () => {
    expect(guard).toBeDefined();
  });

  describe("canActivate", () => {
    const createMockContext = (
      user:
        | AuthenticatedRegularUser
        | AuthenticatedGuest
        | { id: string; email: null; role: string },
    ): ExecutionContext =>
      createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      });

    it("일반 유저면 true를 반환해야 합니다", () => {
      const mockUser: AuthenticatedRegularUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        profileImage: "image.jpg",
        role: "user",
      };

      const result = guard.canActivate(createMockContext(mockUser));

      expect(result).toBe(true);
    });

    it("게스트 유저가 사용량 정보가 없으면 ForbiddenException을 던져야 합니다", () => {
      const mockGuest = {
        id: "guest-123",
        email: null,
        role: "guest" as const,
      } as AuthenticatedGuest;

      expect(() => guard.canActivate(createMockContext(mockGuest))).toThrow(ForbiddenException);
    });

    it("게스트 유저가 사용량 제한을 초과하면 ForbiddenException을 던져야 합니다", () => {
      const mockGuest: AuthenticatedGuest = {
        id: "guest-123",
        email: null,
        role: "guest",
        usageCount: 10,
        maxUsage: 10,
      };

      expect(() => guard.canActivate(createMockContext(mockGuest))).toThrow(ForbiddenException);
    });

    it("게스트 유저가 사용량 제한 내에 있으면 true를 반환해야 합니다", () => {
      const mockGuest: AuthenticatedGuest = {
        id: "guest-123",
        email: null,
        role: "guest",
        usageCount: 5,
        maxUsage: 10,
      };

      const result = guard.canActivate(createMockContext(mockGuest));

      expect(result).toBe(true);
    });

    it("알 수 없는 역할이면 false를 반환해야 합니다", () => {
      const mockUnknown = {
        id: "unknown-123",
        email: null,
        role: "unknown",
      };

      const result = guard.canActivate(createMockContext(mockUnknown));

      expect(result).toBe(false);
    });
  });
});
