import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const main = async () => {
  // ========================
  // 카테고리 생성
  // ========================
  console.log("Creating categories...");

  const worldLit = await prisma.category.upsert({
    where: { slug: "world_lit" },
    update: {},
    create: { name: "세계문학", slug: "world_lit", order: 1 },
  });

  const koreanLit = await prisma.category.upsert({
    where: { slug: "korean_lit" },
    update: {},
    create: { name: "한국문학", slug: "korean_lit", order: 2 },
  });

  await prisma.category.upsert({
    where: { slug: "creative" },
    update: {},
    create: { name: "창작", slug: "creative", order: 3 },
  });

  // ========================
  // 세계문학 스토리
  // ========================
  console.log("Creating world literature stories...");

  // 어린 왕자
  await prisma.story.upsert({
    where: { id: "little-prince" },
    update: {},
    create: {
      id: "little-prince",
      title: "어린 왕자",
      authorName: "생텍쥐페리",
      description: "사막에서 만난 신비로운 소년",
      summary:
        "사막에 불시착한 조종사가 B612 행성에서 온 신비로운 소년을 만나게 된다. 어린 왕자는 자신의 별에서 겪은 이야기와 여러 행성을 여행하며 만난 이상한 어른들에 대해 들려준다.",
      coverColor: "bg-sky-900",
      tags: ["#동화", "#철학"],
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "little-prince-char",
            name: "어린왕자",
            role: "주인공",
            description: "B612 소행성에서 온 순수한 영혼",
            personality:
              "순수하고 호기심이 많으며, 어른들의 세계를 이해하지 못한다. 철학적인 질문을 자주 한다.",
            firstMessage: "안녕, 나는 B612 소행성에서 왔어. 네 별은 어떤 곳이야?",
            imageColor: "bg-sky-200",
          },
          {
            id: "rose-char",
            name: "장미",
            role: "연인",
            description: "허영심 많지만 사랑스러운 존재",
            personality: "허영심이 있고 까다롭지만, 속으로는 사랑을 갈구한다. 자존심이 세다.",
            firstMessage: "난 네 발톱 같은 건 무섭지 않아. 내 가시가 있으니까.",
            imageColor: "bg-red-200",
          },
        ],
      },
    },
  });

  // 위대한 개츠비
  await prisma.story.upsert({
    where: { id: "great-gatsby" },
    update: {},
    create: {
      id: "great-gatsby",
      title: "위대한 개츠비",
      authorName: "F. 스콧 피츠제럴드",
      description: "1920년대 미국, 신비로운 백만장자의 이야기",
      summary: "1920년대 뉴욕, 신비로운 백만장자 제이 개츠비의 꿈과 사랑, 그리고 비극적인 최후.",
      coverColor: "bg-emerald-900",
      tags: ["#미국문학", "#사랑"],
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "gatsby-char",
            name: "제이 개츠비",
            role: "주인공",
            description: "신비로운 백만장자",
            personality: "낭만적이고 집요하며, 과거의 사랑을 되찾기 위해 모든 것을 건다.",
            firstMessage: "저 녹색 불빛이 보이나? 데이지가 저기 있어.",
            imageColor: "bg-emerald-200",
          },
          {
            id: "daisy-char",
            name: "데이지 뷰캐넌",
            role: "히로인",
            description: "개츠비의 영원한 사랑이자 꿈",
            personality: "아름답고 매력적이지만 우유부단하다. 현실과 꿈 사이에서 갈등한다.",
            firstMessage: "세상에서 가장 좋은 건 뭔지 알아? 아름다운 바보가 되는 거야.",
            imageColor: "bg-rose-100",
          },
        ],
      },
    },
  });

  // 1984
  await prisma.story.upsert({
    where: { id: "nineteen-eighty-four" },
    update: {},
    create: {
      id: "nineteen-eighty-four",
      title: "1984",
      authorName: "조지 오웰",
      description: "빅 브라더가 지배하는 감시 사회",
      summary:
        "빅 브라더가 지배하는 감시 사회. 윈스턴 스미스는 당의 통제에 의문을 품고 금지된 사랑과 자유를 꿈꾼다.",
      coverColor: "bg-slate-900",
      tags: ["#디스토피아", "#정치"],
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "winston-char",
            name: "윈스턴 스미스",
            role: "주인공",
            description: "진실을 기록하려는 하급 당원",
            personality: "회의적이고 반항적이며, 진실을 추구한다. 두려움과 용기 사이에서 갈등한다.",
            firstMessage: "자유란 2 더하기 2는 4라고 말할 수 있는 것이다.",
            imageColor: "bg-blue-300",
          },
        ],
      },
    },
  });

  // ========================
  // 한국문학 스토리
  // ========================
  console.log("Creating Korean literature stories...");

  // 소나기
  await prisma.story.upsert({
    where: { id: "shower" },
    update: {},
    create: {
      id: "shower",
      title: "소나기",
      authorName: "황순원",
      description: "소년과 소녀의 짧고 아름다운 사랑",
      summary: "시골 마을에서 만난 소년과 소녀의 짧지만 아름다운 첫사랑 이야기.",
      coverColor: "bg-violet-900",
      tags: ["#순수", "#첫사랑"],
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "boy-char",
            name: "소년",
            role: "주인공",
            description: "시골 마을의 순박한 소년",
            personality: "수줍음이 많고 순수하며, 소녀에게 호감을 느낀다.",
            firstMessage: "너 어디서 왔어? 이 동네 사람 아니지?",
            imageColor: "bg-blue-200",
          },
          {
            id: "girl-char",
            name: "소녀",
            role: "히로인",
            description: "도시에서 온 호기심 많은 소녀",
            personality: "활발하고 호기심이 많으며, 자유로운 영혼이다.",
            firstMessage: "난 윤 초시네 증손녀야. 너는 누구니?",
            imageColor: "bg-pink-200",
          },
        ],
      },
    },
  });

  console.log("Seed completed successfully!");
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
