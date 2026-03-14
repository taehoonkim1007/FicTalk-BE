import { Test, type TestingModule } from "@nestjs/testing";

import { CategoriesService } from "./categories.service";
import type { CategoryResponse } from "./dto/category.dto";
import { CategoriesRepository } from "./repositories/categories.repository";

describe("CategoriesService", () => {
  let service: CategoriesService;

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

  const mockCategoriesRepository = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: mockCategoriesRepository },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("서비스가 정의되어 있어야 합니다", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("카테고리 목록을 반환해야 합니다", async () => {
      mockCategoriesRepository.findAll.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(result).toEqual(mockCategories);
      expect(mockCategoriesRepository.findAll).toHaveBeenCalled();
    });

    it("빈 배열을 반환할 수 있어야 합니다", async () => {
      mockCategoriesRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
