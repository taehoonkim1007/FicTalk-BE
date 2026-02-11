import { createMock } from "@golevelup/ts-jest";
import { type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";

import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockContext = (): ExecutionContext =>
    createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate", () => {
    it("@Public 데코레이터가 있으면 true를 반환해야 한다", () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it("@Public 데코레이터가 없으면 super.canActivate를 호출해야 한다", () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext();
      const superResult = Promise.resolve(true);
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), "canActivate")
        .mockReturnValue(superResult);

      const result = guard.canActivate(context);

      expect(result).toBe(superResult);
      superCanActivate.mockRestore();
    });
  });
});
