import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { type CategoryResponse } from "../dto/category.dto";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryResponse[]> {
    return this.prisma.category.findMany({
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
      },
    });
  }
}
