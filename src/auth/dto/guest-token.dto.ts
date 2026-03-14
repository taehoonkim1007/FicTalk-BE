import { IsOptional, IsString, IsUUID } from "class-validator";

export class GuestTokenDto {
  @IsOptional()
  @IsString()
  @IsUUID("4")
  guestId?: string;
}

export interface GuestTokenResponse {
  accessToken: string;
  guestId: string;
  usageCount: number;
  maxUsage: number;
  expiresIn: string;
}
