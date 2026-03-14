import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthRepository } from "../repositories/auth.repository";
import { type AuthenticatedUser, type JwtPayload } from "../types/auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.role === "guest") {
      return this.validateGuest(payload);
    }

    return this.validateUser(payload);
  }

  private async validateUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: "user",
      name: user.name,
      profileImage: user.profileImage ?? null,
    };
  }

  private async validateGuest(payload: JwtPayload): Promise<AuthenticatedUser> {
    const guestData = await this.authRepository.getGuestSession(payload.sub);

    if (!guestData) {
      throw new UnauthorizedException("Guest session expired or not found");
    }

    return {
      id: payload.sub,
      email: null,
      role: "guest",
      usageCount: guestData.usageCount,
      maxUsage: guestData.maxUsage,
    };
  }
}
