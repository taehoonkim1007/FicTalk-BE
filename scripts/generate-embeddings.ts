import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { Pool } from "pg";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface EmbeddingResponse {
  chunk_count: number;
}

interface StoryWithSummary {
  id: string;
  title: string;
  summary: string | null;
}

const generateEmbedding = async (storyId: string, summary: string): Promise<boolean> => {
  try {
    const response = await axios.post<EmbeddingResponse>(`${AI_SERVER_URL}/api/embeddings/story`, {
      story_id: storyId,
      summary,
    });
    console.log(`  ✓ ${storyId}: ${response.data.chunk_count} chunks`);
    return true;
  } catch (error) {
    console.error(`  ✗ ${storyId}: ${error instanceof Error ? error.message : error}`);
    return false;
  }
};

const main = async () => {
  console.log("=".repeat(50));
  console.log("임베딩 생성 스크립트");
  console.log(`AI Server: ${AI_SERVER_URL}`);
  console.log("=".repeat(50));

  // 옵션: 특정 스토리만 처리 (CLI 인자)
  const targetStoryId = process.argv[2];

  let stories: StoryWithSummary[];
  if (targetStoryId) {
    console.log(`\n대상: ${targetStoryId}`);
    const allStories = await prisma.story.findMany({
      where: { id: targetStoryId },
      select: { id: true, title: true, summary: true },
    });
    stories = allStories.filter((s) => s.summary !== null);
  } else {
    console.log("\n대상: 전체 스토리");
    const allStories = await prisma.story.findMany({
      select: { id: true, title: true, summary: true },
      orderBy: { createdAt: "asc" },
    });
    stories = allStories.filter((s) => s.summary !== null);
  }

  console.log(`총 ${stories.length}개 스토리\n`);

  if (stories.length === 0) {
    console.log("처리할 스토리가 없습니다.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  let success = 0;
  let failed = 0;

  for (const story of stories) {
    console.log(`[${story.title}]`);
    const result = await generateEmbedding(story.id, story.summary!);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`완료: 성공 ${success}개, 실패 ${failed}개`);
  console.log("=".repeat(50));

  await prisma.$disconnect();
  await pool.end();
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
