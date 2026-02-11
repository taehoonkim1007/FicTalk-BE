import { createMock } from "@golevelup/ts-jest";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  type ArgumentsHost,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { AxiosError } from "axios";

import { GlobalExceptionFilter } from "./http-exception.filter";

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;

  const mockJson = jest.fn().mockReturnThis();
  const mockStatus = jest.fn().mockReturnThis();

  const mockResponse = {
    status: mockStatus,
    json: mockJson,
  };

  const mockRequest = {
    method: "GET",
    url: "/test",
  };

  const mockHost = createMock<ArgumentsHost>({
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  });

  const createAxiosError = (options: {
    status: number;
    data: unknown;
    method?: string;
    url?: string;
  }): AxiosError => {
    const error = new AxiosError("Request failed");
    const config = {
      method: options.method ?? "get",
      url: options.url ?? "",
      headers: {},
    } as AxiosError["config"];

    error.config = config;
    error.response = {
      status: options.status,
      data: options.data,
      statusText: options.status >= 500 ? "Internal Server Error" : "Bad Request",
      headers: {},
      config,
    } as AxiosError["response"];

    return error;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("development"),
          },
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    jest.clearAllMocks();
  });

  describe("HttpException 처리", () => {
    it("BadRequestException을 올바르게 처리해야 한다", () => {
      const exception = new BadRequestException("잘못된 요청입니다.");

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "잘못된 요청입니다.",
        }),
      );
    });

    it("NotFoundException을 올바르게 처리해야 한다", () => {
      const exception = new NotFoundException("NOT_FOUND");

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: "NOT_FOUND",
          message: "리소스를 찾을 수 없습니다.",
        }),
      );
    });

    it("문자열 응답을 가진 HttpException을 처리해야 한다", () => {
      const exception = new HttpException("TOKEN_INVALID", HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: "TOKEN_INVALID",
          message: "인증이 필요합니다.",
        }),
      );
    });

    it("validation 에러 배열을 처리해야 한다", () => {
      const exception = new BadRequestException({
        message: ["이메일 형식이 올바르지 않습니다.", "비밀번호가 필요합니다."],
        error: "Bad Request",
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: "이메일 형식이 올바르지 않습니다.",
        }),
      );
    });
  });

  describe("AxiosError 처리", () => {
    it("AI 서버 에러를 올바르게 처리해야 한다", () => {
      const axiosError = createAxiosError({
        status: 500,
        data: { detail: "AI 모델 에러가 발생했습니다." },
        method: "post",
        url: "http://ai-server/generate",
      });

      filter.catch(axiosError, mockHost);

      // 500 에러는 클라이언트에게 일반 메시지로 변환
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "서버 오류가 발생했습니다.",
        }),
      );
    });

    it("AI 서버 4xx 에러를 상세 메시지와 함께 반환해야 한다", () => {
      const axiosError = createAxiosError({
        status: 400,
        data: { message: "잘못된 프롬프트입니다." },
        method: "post",
        url: "http://ai-server/generate",
      });

      filter.catch(axiosError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: "AI_SERVER_ERROR",
          message: "잘못된 프롬프트입니다.",
        }),
      );
    });
  });

  describe("일반 Error 처리", () => {
    it("알 수 없는 에러를 500으로 처리해야 한다", () => {
      const exception = new Error("알 수 없는 에러");

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "서버 오류가 발생했습니다.",
        }),
      );
    });
  });

  describe("상태 코드별 기본 메시지", () => {
    it("401 에러에 기본 메시지를 반환해야 한다", () => {
      const exception = new HttpException({}, HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "TOKEN_INVALID",
          message: "인증이 필요합니다.",
        }),
      );
    });

    it("403 에러에 기본 메시지를 반환해야 한다", () => {
      const exception = new HttpException({}, HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "GUEST_NOT_ALLOWED",
          message: "접근이 거부되었습니다.",
        }),
      );
    });

    it("409 에러에 기본 메시지를 반환해야 한다", () => {
      const exception = new HttpException({}, HttpStatus.CONFLICT);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "CONFLICT",
          message: "요청이 현재 상태와 충돌합니다.",
        }),
      );
    });
  });

  describe("Development 환경", () => {
    it("개발 환경에서 4xx 에러에 stack trace를 포함해야 한다", () => {
      const exception = new BadRequestException("테스트 에러");

      filter.catch(exception, mockHost);

      const call = mockJson.mock.calls[0] as [{ stack?: string }];
      expect(typeof call[0].stack).toBe("string");
    });
  });

  describe("Production 환경", () => {
    let prodFilter: GlobalExceptionFilter;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GlobalExceptionFilter,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue("production"),
            },
          },
        ],
      }).compile();

      prodFilter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    });

    it("프로덕션 환경에서 stack trace를 포함하지 않아야 한다", () => {
      const exception = new BadRequestException("테스트 에러");

      prodFilter.catch(exception, mockHost);

      const call = mockJson.mock.calls[0] as [{ stack?: string }];
      expect(call[0].stack).toBeUndefined();
    });
  });
});
