import { Test, type TestingModule } from "@nestjs/testing";

import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import type { CategoryResponse } from "./dto/category.dto";

describe("CategoriesController", () => {
  let controller: CategoriesController;

  const mockCategories: CategoryResponse[] = [
    {
      id: 1,
      name: "판타지",
      slug: "fantasy",
      order: 1,
      title: "판타지",
      emoji: "🐉",
      description: "마법과 모험의 세계",
      colorClass: "bg-purple-500",
      iconName: "Wand2",
    },
    {
      id: 2,
      name: "로맨스",
      slug: "romance",
      order: 2,
      title: "로맨스",
      emoji: "💕",
      description: "사랑 이야기",
      colorClass: "bg-pink-500",
      iconName: "Heart",
    },
  ];

  const mockCategoriesService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockCategoriesService }],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("컨트롤러가 정의되어 있어야 합니다", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("카테고리 목록을 반환해야 합니다", async () => {
      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll();

      expect(result).toEqual(mockCategories);
      expect(mockCategoriesService.findAll).toHaveBeenCalled();
    });

    it("빈 배열을 반환할 수 있어야 합니다", async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });
});
