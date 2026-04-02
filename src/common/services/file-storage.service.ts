import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type ImageDirectory =
  | "characters/profileImage"
  | "characters/backgroundImage"
  | "stories/coverImage"
  | "stories/backgroundImage"
  | "users/profileImage";

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly supportedFormats = ["png", "jpeg", "jpg", "webp", "gif"];
  private readonly isProduction: boolean;

  // Local storage
  private readonly uploadBasePath: string;

  // S3 storage
  private readonly s3Client: S3Client | null = null;
  private readonly s3Bucket: string | null = null;
  private readonly s3BaseUrl: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get("NODE_ENV") === "production";
    this.uploadBasePath = join(process.cwd(), "public", "uploads");

    if (this.isProduction) {
      this.s3Client = new S3Client({
        region: this.configService.getOrThrow("AWS_REGION"),
        credentials: {
          accessKeyId: this.configService.getOrThrow("AWS_ACCESS_KEY_ID"),
          secretAccessKey: this.configService.getOrThrow("AWS_SECRET_ACCESS_KEY"),
        },
      });
      this.s3Bucket = this.configService.getOrThrow("AWS_S3_BUCKET");
      this.s3BaseUrl = this.configService.getOrThrow("AWS_S3_BASE_URL");
      this.logger.log("FileStorageService initialized with S3");
    } else {
      this.logger.log("FileStorageService initialized with local storage");
    }
  }

  /**
   * 이미지 입력을 처리합니다.
   * - base64 data URL인 경우: 파일로 저장하고 URL 경로 반환
   * - 일반 URL인 경우: 그대로 반환
   */
  async processImage(
    input: string | undefined | null,
    directory: ImageDirectory,
  ): Promise<string | undefined> {
    if (!input) {
      return undefined;
    }

    if (!this.isBase64DataUrl(input)) {
      return input;
    }

    try {
      const { format, data } = this.parseBase64DataUrl(input);
      this.validateFormat(format);

      const buffer = Buffer.from(data, "base64");
      const key = `${directory}/${randomUUID()}.${format}`;

      const urlPath = this.isProduction
        ? await this.saveToS3(buffer, key, format)
        : await this.saveToLocal(buffer, key);

      this.logger.log(`Saved image to ${urlPath}`);
      return urlPath;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to save image: ${error}`);
      throw new BadRequestException("이미지 저장에 실패했습니다.");
    }
  }

  /**
   * 이미지 파일 삭제 (AI 생성 이미지만)
   * UUID 패턴이 아닌 파일은 seed 데이터로 간주하여 삭제하지 않음
   */
  async deleteImage(urlPath: string | null | undefined): Promise<void> {
    if (!urlPath) {
      return;
    }

    const filename = urlPath.split("/").pop();
    if (!filename || !this.isUuidFilename(filename)) {
      return;
    }

    try {
      if (this.isProduction) {
        await this.deleteFromS3(urlPath);
      } else {
        await this.deleteFromLocal(urlPath);
      }
      this.logger.log(`Deleted image: ${urlPath}`);
    } catch {
      this.logger.warn(`Failed to delete image: ${urlPath}`);
    }
  }

  // ========================
  // Local Storage Methods
  // ========================

  private async saveToLocal(buffer: Buffer, key: string): Promise<string> {
    const dirPath = join(this.uploadBasePath, key.substring(0, key.lastIndexOf("/")));
    const filePath = join(this.uploadBasePath, key);

    await mkdir(dirPath, { recursive: true });
    await writeFile(filePath, buffer);

    return `/uploads/${key}`;
  }

  private async deleteFromLocal(urlPath: string): Promise<void> {
    if (!urlPath.startsWith("/uploads/")) {
      return;
    }

    const filePath = join(this.uploadBasePath, urlPath.replace("/uploads/", ""));
    await unlink(filePath);
  }

  // ========================
  // S3 Storage Methods
  // ========================

  private async saveToS3(buffer: Buffer, key: string, format: string): Promise<string> {
    if (!this.s3Client || !this.s3Bucket || !this.s3BaseUrl) {
      throw new Error("S3 is not configured");
    }

    const contentType = `image/${format === "jpg" ? "jpeg" : format}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return `${this.s3BaseUrl}/${key}`;
  }

  private async deleteFromS3(urlPath: string): Promise<void> {
    if (!this.s3Client || !this.s3Bucket || !this.s3BaseUrl) {
      return;
    }

    if (!urlPath.startsWith(this.s3BaseUrl)) {
      return;
    }

    const key = urlPath.replace(`${this.s3BaseUrl}/`, "");

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      }),
    );
  }

  // ========================
  // Utility Methods
  // ========================

  private isBase64DataUrl(input: string): boolean {
    return input.startsWith("data:image/");
  }

  private parseBase64DataUrl(dataUrl: string): { format: string; data: string } {
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);

    if (!matches) {
      throw new BadRequestException("유효하지 않은 이미지 형식입니다.");
    }

    return {
      format: matches[1],
      data: matches[2],
    };
  }

  private validateFormat(format: string): void {
    if (!this.supportedFormats.includes(format.toLowerCase())) {
      throw new BadRequestException(`지원하지 않는 이미지 형식입니다: ${format}`);
    }
  }

  private isUuidFilename(filename: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\w+$/i;
    return uuidPattern.test(filename);
  }
}
