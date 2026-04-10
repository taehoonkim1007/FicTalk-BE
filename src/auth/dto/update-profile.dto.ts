import { IsOptional, IsString, Length } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;
}
