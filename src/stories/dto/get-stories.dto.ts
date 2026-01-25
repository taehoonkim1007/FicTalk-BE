import { Transform, type TransformFnParams } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GetStoriesDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @Transform(({ value }: TransformFnParams) => (value ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page: number = 1;

  @Transform(({ value }: TransformFnParams) => (value ? Number(value) : 12))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
