import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { type Request } from "express";

import { type AuthenticatedUser } from "../types/auth.types";

@Injectable()
export class GuestUsageGuard implements CanActivate {
  private readonly logger = new Logger(GuestUsageGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (user.role === "user") {
      return true;
    }

    if (user.role === "guest") {
      if (user.usageCount === undefined || user.maxUsage === undefined) {
        throw new ForbiddenException("Guest usage information not found");
      }

      if (user.usageCount >= user.maxUsage) {
        this.logger.warn(
          `Guest Usage Limit Exceeded (Guard): ${user.id} (${user.usageCount}/${user.maxUsage})`,
        );
        throw new ForbiddenException(
          `Guest usage limit exceeded. Maximum ${user.maxUsage} uses allowed.`,
        );
      }

      return true;
    }

    return false;
  }
}
