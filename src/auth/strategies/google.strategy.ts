import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback } from "passport-google-oauth20";

import { type GoogleProfile } from "../types/auth.types";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>("GOOGLE_CLIENT_ID"),
      clientSecret: configService.getOrThrow<string>("GOOGLE_CLIENT_SECRET"),
      callbackURL: configService.getOrThrow<string>("GOOGLE_CALLBACK_URL"),
      scope: ["email", "profile"],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName: string;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ): void {
    const user: GoogleProfile = {
      id: profile.id,
      email: profile.emails?.[0]?.value ?? "",
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
    };

    done(null, user);
  }
}
