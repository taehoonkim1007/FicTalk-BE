import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { type Request } from "express";

import { type AuthenticatedUser } from "../../auth/types/auth.types";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
