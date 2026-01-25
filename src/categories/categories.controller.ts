import { Controller, Get } from "@nestjs/common";

import { Public } from "../common/decorators/public.decorator";
import { CategoriesService } from "./categories.service";
import { type CategoryResponse } from "./dto/category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async findAll(): Promise<CategoryResponse[]> {
    return this.categoriesService.findAll();
  }
}
