import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GuestUsageGuard } from "./guards/guest-usage.guard";
import { AuthRepository } from "./repositories/auth.repository";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, GoogleStrategy, JwtStrategy, GuestUsageGuard],
  exports: [AuthService, GuestUsageGuard],
})
export class AuthModule {}
