import { Body, Controller, Get, Ip, Logger, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type Response } from "express";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { REFRESH_TOKEN_TTL } from "./constants";
import { ExchangeCodeDto } from "./dto/exchange-code.dto";
import { GuestTokenDto, type GuestTokenResponse } from "./dto/guest-token.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { type AuthenticatedUser, type GoogleAuthRequest } from "./types/auth.types";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ========================
  // Google OAuth
  // ========================

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Guard가 Google OAuth 페이지로 리다이렉트
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: GoogleAuthRequest, @Res() res: Response): Promise<void> {
    const googleProfile = req.user;
    const user = await this.authService.validateGoogleUser(googleProfile);
    const code = await this.authService.createAuthCode(user.id);

    this.logger.log(`Google Login Success: ${user.email} (ID: ${user.id})`);

    const frontendUrl = this.configService.getOrThrow<string>("FRONTEND_URL");
    const redirectUrl = `${frontendUrl}/auth/callback?code=${code}`;

    res.redirect(redirectUrl);
  }

  @Public()
  @Post("exchange")
  async exchangeCode(@Body() dto: ExchangeCodeDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.exchangeCodeForTokens(dto.code);
    const tokens = await this.authService.generateTokens(user);

    this.logger.log(`Token Exchange Success: User ID ${user.id}`);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction ? true : false,
      sameSite: isProduction ? "none" : "lax",
      maxAge: REFRESH_TOKEN_TTL,
    });

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post("refresh")
  async refresh(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
    this.logger.debug("Token Refresh Requested");
    const tokens = await this.authService.refreshTokens(dto.refreshToken);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction ? true : false,
      sameSite: isProduction ? "none" : "lax",
      maxAge: REFRESH_TOKEN_TTL,
    });

    return tokens;
  }

  @Post("logout")
  async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    if (user.role === "user") {
      await this.authService.logout(user.id);
      this.logger.log(`User Logged Out: ${user.id}`);
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction ? true : false,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    return { message: "Logged out successfully" };
  }

  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === "guest") {
      return {
        id: user.id,
        email: null,
        role: "guest",
        usageCount: user.usageCount,
        maxUsage: user.maxUsage,
      };
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      role: "user",
    };
  }

  // ========================
  // Guest
  // ========================

  @Public()
  @Post("guest")
  async guestToken(
    @Body() dto: GuestTokenDto,
    @Ip() clientIp: string,
  ): Promise<GuestTokenResponse> {
    if (dto.guestId) {
      this.logger.log(`Guest Token Refresh: ${dto.guestId} (IP: ${clientIp})`);
      return this.authService.refreshGuestToken(dto.guestId, clientIp);
    }

    this.logger.log(`New Guest Token Created (IP: ${clientIp})`);
    return this.authService.createGuestToken(clientIp);
  }
}
