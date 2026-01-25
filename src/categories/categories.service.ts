import { Injectable } from "@nestjs/common";

import { type CategoryResponse } from "./dto/category.dto";
import { CategoriesRepository } from "./repositories/categories.repository";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(): Promise<CategoryResponse[]> {
    return this.categoriesRepository.findAll();
  }
}
