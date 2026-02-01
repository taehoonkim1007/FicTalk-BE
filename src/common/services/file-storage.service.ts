import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";

export type ImageDirectory =
  | "characters/profileImage"
  | "characters/backgroundImage"
  | "stories/coverImage"
  | "stories/backgroundImage";

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadBasePath: string;
  private readonly supportedFormats = ["png", "jpeg", "jpg", "webp", "gif"];

  constructor() {
    this.uploadBasePath = join(process.cwd(), "public", "uploads");
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

      const urlPath = await this.saveBase64ToFile(data, format, directory);
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

  private async saveBase64ToFile(
    base64Data: string,
    format: string,
    directory: ImageDirectory,
  ): Promise<string> {
    const uuid = randomUUID();
    const filename = `${uuid}.${format}`;
    const dirPath = join(this.uploadBasePath, directory);
    const filePath = join(dirPath, filename);

    await mkdir(dirPath, { recursive: true });

    const buffer = Buffer.from(base64Data, "base64");
    await writeFile(filePath, buffer);

    return `/uploads/${directory}/${filename}`;
  }

  /**
   * 이미지 파일 삭제 (AI 생성 이미지만)
   * UUID 패턴이 아닌 파일은 seed 데이터로 간주하여 삭제하지 않음
   */
  async deleteImage(urlPath: string | null | undefined): Promise<void> {
    if (!urlPath || !urlPath.startsWith("/uploads/")) {
      return;
    }

    const filename = urlPath.split("/").pop();
    if (!filename || !this.isUuidFilename(filename)) {
      return; // seed 데이터 보호
    }

    const filePath = join(this.uploadBasePath, urlPath.replace("/uploads/", ""));

    try {
      await unlink(filePath);
      this.logger.log(`Deleted image: ${urlPath}`);
    } catch {
      this.logger.warn(`Failed to delete image: ${urlPath}`);
    }
  }

  private isUuidFilename(filename: string): boolean {
    // UUID 패턴: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.ext
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\w+$/i;
    return uuidPattern.test(filename);
  }
}
