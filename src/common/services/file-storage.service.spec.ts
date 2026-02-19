import { mkdir, unlink, writeFile } from "fs/promises";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";

import { FileStorageService } from "./file-storage.service";

jest.mock("fs/promises", () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn().mockReturnValue("12345678-1234-1234-1234-123456789012"),
}));

describe("FileStorageService", () => {
  let service: FileStorageService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue("development"),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    jest.clearAllMocks();
  });

  describe("processImage", () => {
    it("null 또는 undefined 입력 시 undefined를 반환해야 한다", async () => {
      expect(await service.processImage(null, "characters/profileImage")).toBeUndefined();
      expect(await service.processImage(undefined, "characters/profileImage")).toBeUndefined();
      expect(await service.processImage("", "characters/profileImage")).toBeUndefined();
    });

    it("일반 URL은 그대로 반환해야 한다", async () => {
      const url = "https://example.com/image.jpg";
      const result = await service.processImage(url, "characters/profileImage");
      expect(result).toBe(url);
    });

    it("base64 PNG 이미지를 파일로 저장하고 URL을 반환해야 한다", async () => {
      const base64Image =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      (mkdir as jest.Mock).mockResolvedValue(undefined);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.processImage(base64Image, "characters/profileImage");

      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
      expect(result).toBe(
        "/uploads/characters/profileImage/12345678-1234-1234-1234-123456789012.png",
      );
    });

    it("base64 JPEG 이미지를 파일로 저장해야 한다", async () => {
      const base64Image =
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=";

      (mkdir as jest.Mock).mockResolvedValue(undefined);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.processImage(base64Image, "stories/coverImage");

      expect(result).toBe("/uploads/stories/coverImage/12345678-1234-1234-1234-123456789012.jpeg");
    });

    it("지원하지 않는 이미지 형식은 BadRequestException을 던져야 한다", async () => {
      const base64Image = "data:image/bmp;base64,Qk0=";

      await expect(service.processImage(base64Image, "characters/profileImage")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("유효하지 않은 base64 형식은 BadRequestException을 던져야 한다", async () => {
      const invalidBase64 = "data:image/invalid-format";

      await expect(service.processImage(invalidBase64, "characters/profileImage")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("파일 저장 실패 시 BadRequestException을 던져야 한다", async () => {
      const base64Image = "data:image/png;base64,iVBORw0KGgo=";

      (mkdir as jest.Mock).mockRejectedValue(new Error("Disk full"));

      await expect(service.processImage(base64Image, "characters/profileImage")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("deleteImage", () => {
    it("null 또는 undefined 경로는 무시해야 한다", async () => {
      await service.deleteImage(null);
      await service.deleteImage(undefined);

      expect(unlink).not.toHaveBeenCalled();
    });

    it("/uploads/로 시작하지 않는 경로는 무시해야 한다", async () => {
      await service.deleteImage("https://example.com/image.jpg");
      await service.deleteImage("/static/image.jpg");

      expect(unlink).not.toHaveBeenCalled();
    });

    it("UUID 패턴이 아닌 파일명은 삭제하지 않아야 한다 (seed 데이터 보호)", async () => {
      await service.deleteImage("/uploads/characters/profileImage/seed-image.jpg");

      expect(unlink).not.toHaveBeenCalled();
    });

    it("UUID 패턴의 파일을 삭제해야 한다", async () => {
      (unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteImage(
        "/uploads/characters/profileImage/12345678-1234-1234-1234-123456789012.png",
      );

      expect(unlink).toHaveBeenCalled();
    });

    it("파일 삭제 실패 시 에러를 던지지 않아야 한다", async () => {
      (unlink as jest.Mock).mockRejectedValue(new Error("File not found"));

      await expect(
        service.deleteImage(
          "/uploads/characters/profileImage/12345678-1234-1234-1234-123456789012.png",
        ),
      ).resolves.not.toThrow();
    });
  });

  describe("지원 형식 검증", () => {
    const supportedFormats = ["png", "jpeg", "jpg", "webp", "gif"];

    it.each(supportedFormats)("%s 형식을 지원해야 한다", async (format) => {
      const base64Image = `data:image/${format};base64,AAAA`;

      (mkdir as jest.Mock).mockResolvedValue(undefined);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.processImage(base64Image, "characters/profileImage");

      expect(result).toContain(`.${format}`);
    });
  });

  describe("디렉토리 경로", () => {
    const directories: Array<
      | "characters/profileImage"
      | "characters/backgroundImage"
      | "stories/coverImage"
      | "stories/backgroundImage"
    > = [
      "characters/profileImage",
      "characters/backgroundImage",
      "stories/coverImage",
      "stories/backgroundImage",
    ];

    it.each(directories)("%s 디렉토리에 저장해야 한다", async (directory) => {
      const base64Image = "data:image/png;base64,iVBORw0KGgo=";

      (mkdir as jest.Mock).mockResolvedValue(undefined);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.processImage(base64Image, directory);

      expect(result).toContain(`/uploads/${directory}/`);
    });
  });
});
