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
    where: { slug: "world-lit" },
    update: {},
    create: { name: "세계 문학", slug: "world-lit", order: 1 },
  });

  const koreanLit = await prisma.category.upsert({
    where: { slug: "korean-lit" },
    update: {},
    create: { name: "한국 문학", slug: "korean-lit", order: 2 },
  });

  const creative = await prisma.category.upsert({
    where: { slug: "creative" },
    update: {},
    create: { name: "창작", slug: "creative", order: 3 },
  });

  // ========================
  // 1. 세계문학 스토리 (총 8개)
  // ========================
  console.log("Creating world literature stories...");

  // 1-1. 어린 왕자 (기존)
  await prisma.story.upsert({
    where: { id: "little-prince" },
    update: {},
    create: {
      id: "little-prince",
      title: "어린 왕자",
      authorName: "생텍쥐페리",
      description: "사막에서 만난 신비로운 소년",
      summary: "사막에 불시착한 조종사가 B612 행성에서 온 신비로운 소년을 만나게 된다.",
      coverColor: "bg-sky-900",
      marketingTitle: "중요한 건 눈에 보이지 않아",
      marketingDescription: "사막에서 만난 신비로운 소년과 대화해보세요.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "little-prince-char",
            name: "어린왕자",
            role: "주인공",
            description: "B612 소행성에서 온 순수한 영혼",
            personality: "순수하고 호기심이 많으며, 어른들의 세계를 이해하지 못한다.",
            firstMessage: "안녕, 나는 B612 소행성에서 왔어. 네 별은 어떤 곳이야?",
            imageColor: "bg-sky-200",
          },
        ],
      },
    },
  });

  // 1-2. 위대한 개츠비 (기존)
  await prisma.story.upsert({
    where: { id: "great-gatsby" },
    update: {},
    create: {
      id: "great-gatsby",
      title: "위대한 개츠비",
      authorName: "F. 스콧 피츠제럴드",
      description: "1920년대 미국, 신비로운 백만장자",
      summary: "1920년대 뉴욕, 신비로운 백만장자 제이 개츠비의 꿈과 사랑, 그리고 비극적인 최후.",
      coverColor: "bg-emerald-900",
      marketingTitle: "저 녹색 불빛을 향해",
      marketingDescription: "1920년대 뉴욕, 화려한 파티 뒤에 숨겨진 이야기.",
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
        ],
      },
    },
  });

  // 1-3. 1984 (기존)
  await prisma.story.upsert({
    where: { id: "nineteen-eighty-four" },
    update: {},
    create: {
      id: "nineteen-eighty-four",
      title: "1984",
      authorName: "조지 오웰",
      description: "빅 브라더가 지배하는 감시 사회",
      summary: "빅 브라더가 지배하는 감시 사회. 윈스턴 스미스는 당의 통제에 의문을 품는다.",
      coverColor: "bg-slate-900",
      marketingTitle: "빅 브라더가 당신을 지켜보고 있다",
      marketingDescription: "감시 사회에서 자유를 꿈꾸는 한 남자의 이야기.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "winston-char",
            name: "윈스턴 스미스",
            role: "주인공",
            description: "진실을 기록하려는 하급 당원",
            personality: "회의적이고 반항적이며, 진실을 추구한다.",
            firstMessage: "자유란 2 더하기 2는 4라고 말할 수 있는 것이다.",
            imageColor: "bg-blue-300",
          },
        ],
      },
    },
  });

  // 1-4. 데미안 (추가)
  await prisma.story.upsert({
    where: { id: "demian" },
    update: {},
    create: {
      id: "demian",
      title: "데미안",
      authorName: "헤르만 헤세",
      description: "알을 깨고 나오려는 한 소년의 투쟁",
      summary:
        "선과 악의 이분법적인 세계에서 고민하던 싱클레어가 데미안을 만나 자아를 찾아가는 성장 소설.",
      coverColor: "bg-stone-800",
      marketingTitle: "새는 알을 깨고 나온다",
      marketingDescription: "진정한 자아를 찾아 떠나는 내면의 여정.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "demian-char",
            name: "막스 데미안",
            role: "멘토",
            description: "신비로운 분위기의 인도자",
            personality: "성숙하고 통찰력이 뛰어나며, 선과 악을 넘어선 진리를 추구한다.",
            firstMessage:
              "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
            imageColor: "bg-stone-300",
          },
        ],
      },
    },
  });

  // 1-5. 변신 (추가)
  await prisma.story.upsert({
    where: { id: "metamorphosis" },
    update: {},
    create: {
      id: "metamorphosis",
      title: "변신",
      authorName: "프란츠 카프카",
      description: "어느 날 갑자기 벌레로 변해버린 남자",
      summary:
        "평범한 영업사원 그레고르 잠자가 어느 날 아침 거대한 독벌레로 변하면서 겪는 가족과의 단절과 소외.",
      coverColor: "bg-neutral-900",
      marketingTitle: "어느 날 아침, 눈을 떴을 때...",
      marketingDescription: "현대인의 불안과 소외를 다룬 카프카의 걸작.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "gregor-char",
            name: "그레고르 잠자",
            role: "주인공",
            description: "벌레로 변해버린 영업사원",
            personality:
              "성실하고 가족을 끔찍이 아끼지만, 벌레가 된 후 소외감을 느낀다. 소심하고 우울하다.",
            firstMessage:
              "이게 어떻게 된 일이지? 이건 꿈이 아니야. 내 몸이... 다리가 도대체 몇 개지?",
            imageColor: "bg-neutral-400",
          },
        ],
      },
    },
  });

  // 1-6. 오만과 편견 (추가)
  await prisma.story.upsert({
    where: { id: "pride-and-prejudice" },
    update: {},
    create: {
      id: "pride-and-prejudice",
      title: "오만과 편견",
      authorName: "제인 오스틴",
      description: "19세기 영국의 로맨스와 사회 풍자",
      summary:
        "베넷 가의 둘째 딸 엘리자베스와 부유한 신사 다아시가 오만과 편견을 극복하고 사랑에 빠지는 이야기.",
      coverColor: "bg-rose-900",
      marketingTitle: "사랑을 시작하는 우리의 자세",
      marketingDescription: "오만함과 편견을 넘어 진정한 사랑을 확인하다.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "elizabeth-char",
            name: "엘리자베스 베넷",
            role: "주인공",
            description: "지적이고 위트 있는 여성",
            personality: "활발하고 재치 있으며, 사람을 판단하는 데 있어 자신만의 기준이 확고하다.",
            firstMessage: "다아시 씨, 당신은 오만해요. 다른 사람의 감정을 전혀 배려하지 않는군요.",
            imageColor: "bg-rose-200",
          },
          {
            id: "darcy-char",
            name: "미스터 다아시",
            role: "남주인공",
            description: "무뚝뚝하지만 속깊은 신사",
            personality: "겉으로는 차갑고 오만해 보이지만, 실제로는 사려 깊고 정직하다.",
            firstMessage: "당신을 열렬히 사모하고 있습니다. 제 청혼을 받아주십시오.",
            imageColor: "bg-slate-300",
          },
        ],
      },
    },
  });

  // 1-7. 셜록 홈즈 (추가)
  await prisma.story.upsert({
    where: { id: "sherlock-holmes" },
    update: {},
    create: {
      id: "sherlock-holmes",
      title: "셜록 홈즈",
      authorName: "아서 코난 도일",
      description: "베이커 가의 천재 탐정",
      summary: "런던의 자문 탐정 셜록 홈즈와 그의 친구 왓슨 박사가 해결하는 미스터리한 사건들.",
      coverColor: "bg-zinc-800",
      marketingTitle: "불가능을 제외하고 남은 것",
      marketingDescription: "그것이 아무리 믿을 수 없는 것이라 해도 진실이다.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "holmes-char",
            name: "셜록 홈즈",
            role: "주인공",
            description: "천재적인 추리력을 가진 탐정",
            personality: "냉철하고 논리적이며, 감정보다는 사실을 중시한다. 지루함을 참지 못한다.",
            firstMessage:
              "관찰만 하고 보질 않는군, 왓슨. 자네 구두에 묻은 흙을 보면 어디 다녀왔는지 뻔해.",
            imageColor: "bg-zinc-300",
          },
        ],
      },
    },
  });

  // 1-8. 노인과 바다 (추가)
  await prisma.story.upsert({
    where: { id: "old-man-sea" },
    update: {},
    create: {
      id: "old-man-sea",
      title: "노인과 바다",
      authorName: "어니스트 헤밍웨이",
      description: "거대한 청새치와 사투를 벌이는 노인",
      summary:
        "84일간 고기를 잡지 못한 노인이 먼 바다로 나가 거대한 청새치와 목숨을 건 사투를 벌인다.",
      coverColor: "bg-blue-900",
      marketingTitle: "인간은 파괴될지언정 패배하지 않는다",
      marketingDescription: "불굴의 의지로 운명에 맞서는 인간의 존엄성.",
      isOfficial: true,
      categoryId: worldLit.id,
      characters: {
        create: [
          {
            id: "santiago-char",
            name: "산티아고",
            role: "주인공",
            description: "쿠바의 늙은 어부",
            personality: "강인하고 끈기 있으며, 자연을 존중하면서도 굴복하지 않는 의지를 가졌다.",
            firstMessage: "놈은 정말 거대해. 하지만 내가 놈보다 더 끈질기다는 걸 보여주겠어.",
            imageColor: "bg-blue-400",
          },
        ],
      },
    },
  });

  // ========================
  // 2. 한국문학 스토리 (총 8개)
  // ========================
  console.log("Creating Korean literature stories...");

  // 2-1. 소나기 (기존)
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
      marketingTitle: "소나기가 내리던 그 날",
      marketingDescription: "소년과 소녀의 짧고 아름다운 첫사랑 이야기.",
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
            imageColor: "bg-violet-200",
          },
          {
            id: "girl-char",
            name: "소녀",
            role: "히로인",
            description: "도시에서 온 병약한 소녀",
            personality: "활발한 척하지만 외로움을 타며, 소년과 친해지고 싶어한다.",
            firstMessage: "이 바보. 조약돌이 그리도 좋니?",
            imageColor: "bg-pink-200",
          },
        ],
      },
    },
  });

  // 2-2. 운수 좋은 날 (추가)
  await prisma.story.upsert({
    where: { id: "lucky-day" },
    update: {},
    create: {
      id: "lucky-day",
      title: "운수 좋은 날",
      authorName: "현진건",
      description: "가난한 인력거꾼의 비극적인 하루",
      summary:
        "비 오는 날, 유난히 손님이 많아 돈을 많이 벌게 된 김첨지. 아내에게 설렁탕을 사줄 수 있어 기뻤으나 집에 돌아오니 비극이 기다리고 있었다.",
      coverColor: "bg-gray-800",
      marketingTitle: "설렁탕을 사왔는데 왜 먹질 못하니",
      marketingDescription: "일제강점기 하층민의 비참한 현실을 그린 사실주의 수작.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "kim-chumji-char",
            name: "김첨지",
            role: "주인공",
            description: "거칠지만 속정 깊은 인력거꾼",
            personality:
              "말투는 거칠고 욕을 잘하지만, 아픈 아내를 끔찍이 걱정한다. 현실의 무게에 짓눌려 있다.",
            firstMessage: "제기랄, 오늘은 운수가 대통이라니까! 돈이 막 굴러들어와.",
            imageColor: "bg-gray-300",
          },
        ],
      },
    },
  });

  // 2-3. 봄봄 (추가)
  await prisma.story.upsert({
    where: { id: "spring-spring" },
    update: {},
    create: {
      id: "spring-spring",
      title: "봄봄",
      authorName: "김유정",
      description: "순박한 데릴사위와 욕심쟁이 장인",
      summary:
        "점순이와 성례를 시켜준다는 약속만 믿고 3년 7개월째 머슴살이를 하는 '나'와 꾀 많은 장인어른의 갈등.",
      coverColor: "bg-lime-900",
      marketingTitle: "성례는 언제 시켜줄 건가요!",
      marketingDescription: "해학적인 웃음 속에 담긴 농촌 청년의 순박한 사랑.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "me-spring-char",
            name: "나",
            role: "주인공",
            description: "어수룩한 데릴사위",
            personality: "순박하고 조금 모자라 보일 정도로 우직하다. 점순이와의 결혼만을 기다린다.",
            firstMessage: "장인님! 이번엔 정말 성례 시켜주시는 거죠? 키는 잴 필요도 없어요!",
            imageColor: "bg-lime-200",
          },
          {
            id: "jeomsun-char",
            name: "점순이",
            role: "히로인",
            description: "나의 예비 신부",
            personality: "당차고 야무지다. 답답한 '나'를 부추겨 아버지와 싸움을 붙이기도 한다.",
            firstMessage: "밤낮 일만 하고 있을 게유? 구장님한테 가서 따지기라도 해봐유!",
            imageColor: "bg-orange-200",
          },
        ],
      },
    },
  });

  // 2-4. 날개 (추가)
  await prisma.story.upsert({
    where: { id: "wings" },
    update: {},
    create: {
      id: "wings",
      title: "날개",
      authorName: "이상",
      description: "박제가 되어버린 천재의 독백",
      summary:
        "무기력한 삶을 살던 지식인 '나'가 아내의 매춘 사실을 깨닫고 자아를 찾아 미쓰코시 백화점 옥상으로 향한다.",
      coverColor: "bg-zinc-700",
      marketingTitle: "날개야 다시 돋아라",
      marketingDescription: "식민지 지식인의 분열된 자아와 내면 의식의 흐름.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "me-wings-char",
            name: "나",
            role: "주인공",
            description: "무기력한 지식인",
            personality:
              "현실 감각이 없고 몽상적이다. 아내에게 기생하며 살아가지만 끊임없이 사유한다.",
            firstMessage: "박제가 되어버린 천재를 아시오? 나는 유쾌하오.",
            imageColor: "bg-zinc-200",
          },
        ],
      },
    },
  });

  // 2-5. 메밀꽃 필 무렵 (추가)
  await prisma.story.upsert({
    where: { id: "buckwheat" },
    update: {},
    create: {
      id: "buckwheat",
      title: "메밀꽃 필 무렵",
      authorName: "이효석",
      description: "달빛 아래 펼쳐진 메밀밭의 추억",
      summary:
        "장돌뱅이 허 생원이 달밤의 메밀밭을 걸으며 젊은 날의 하룻밤 사랑을 회상하고, 자신의 아들일지도 모르는 동이를 만난다.",
      coverColor: "bg-indigo-900",
      marketingTitle: "숨이 막힐 듯 하얀 메밀꽃",
      marketingDescription: "한국 문학사상 가장 서정적이고 아름다운 묘사.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "heo-char",
            name: "허 생원",
            role: "주인공",
            description: "나이 든 장돌뱅이",
            personality: "투박하지만 낭만적인 추억을 간직하고 있다. 왼손잡이다.",
            firstMessage: "달이 너무 밝아서 말이야... 그날 밤도 오늘처럼 달이 밝았지.",
            imageColor: "bg-indigo-200",
          },
        ],
      },
    },
  });

  // 2-6. 동백꽃 (추가)
  await prisma.story.upsert({
    where: { id: "camellia" },
    update: {},
    create: {
      id: "camellia",
      title: "동백꽃",
      authorName: "김유정",
      description: "산골 소년 소녀의 풋풋한 사랑 싸움",
      summary:
        "소작농의 아들인 '나'와 마름의 딸 '점순이'가 닭싸움을 매개로 벌이는 애정 공세와 갈등.",
      coverColor: "bg-yellow-900",
      marketingTitle: "느 집엔 이거 없지?",
      marketingDescription: "알싸한 노란 동백꽃 향기 같은 풋사랑 이야기.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "me-camellia-char",
            name: "나",
            role: "주인공",
            description: "눈치 없는 산골 소년",
            personality: "우직하고 눈치가 없다. 점순이의 괴롭힘이 관심의 표현인 줄 모른다.",
            firstMessage: "점순아, 우리 닭 좀 그만 괴롭혀. 닭이 무슨 죄가 있다고 그래?",
            imageColor: "bg-yellow-200",
          },
          {
            id: "jeomsun-camellia-char",
            name: "점순이",
            role: "히로인",
            description: "적극적인 마름의 딸",
            personality: "좋아하는 마음을 괴롭힘으로 표현하는 츤데레 스타일. 당돌하다.",
            firstMessage: "느 집엔 이거 없지? 감자야. 너나 먹어라.",
            imageColor: "bg-red-200",
          },
        ],
      },
    },
  });

  // 2-7. 홍길동전 (추가)
  await prisma.story.upsert({
    where: { id: "hong-gildong" },
    update: {},
    create: {
      id: "hong-gildong",
      title: "홍길동전",
      authorName: "허균",
      description: "동에 번쩍 서에 번쩍 의적 홍길동",
      summary:
        "서자로 태어나 아버지를 아버지라 부르지 못하던 길동이 집을 떠나 의적이 되어 탐관오리를 벌하고 율도국을 세운다.",
      coverColor: "bg-blue-800",
      marketingTitle: "아버지를 아버지라 부르지 못하고",
      marketingDescription: "조선 시대의 불합리에 맞선 영웅의 이야기.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "gildong-char",
            name: "홍길동",
            role: "주인공",
            description: "도술을 부리는 의적",
            personality: "정의롭고 비범한 능력을 가졌다. 신분 제도의 모순에 고뇌한다.",
            firstMessage:
              "소인이 평생 서러운 것은, 아버지를 아버지라 부르지 못하고 형을 형이라 부르지 못하는 것입니다.",
            imageColor: "bg-blue-300",
          },
        ],
      },
    },
  });

  // 2-8. 구운몽 (추가)
  await prisma.story.upsert({
    where: { id: "guunmong" },
    update: {},
    create: {
      id: "guunmong",
      title: "구운몽",
      authorName: "김만중",
      description: "성진의 하룻밤 꿈",
      summary:
        "불제자 성진이 팔선녀를 희롱한 죄로 인간 세상에 양소유로 환생하여 부귀영화를 누리다 깨달음을 얻는 이야기.",
      coverColor: "bg-purple-900",
      marketingTitle: "인생은 일장춘몽이라",
      marketingDescription: "꿈과 현실을 오가는 환상적인 이야기.",
      isOfficial: true,
      categoryId: koreanLit.id,
      characters: {
        create: [
          {
            id: "seongjin-char",
            name: "성진/양소유",
            role: "주인공",
            description: "도를 닦는 승려이자 부귀영화를 누린 영웅",
            personality:
              "풍류를 즐길 줄 알며, 뛰어난 능력으로 세상의 모든 복을 누리지만 결국 허무함을 깨닫는다.",
            firstMessage: "세상만사 부귀영화가 다 헛되도다. 꿈을 꾸었구나.",
            imageColor: "bg-purple-300",
          },
        ],
      },
    },
  });

  // ========================
  // 3. 창작 스토리 (총 8개)
  // ========================
  console.log("Creating creative stories...");

  // 3-1. 심야 편의점의 불청객
  await prisma.story.upsert({
    where: { id: "midnight-store" },
    update: {},
    create: {
      id: "midnight-store",
      title: "심야 편의점",
      authorName: "AI 작가",
      description: "새벽 2시, 귀신이 담배를 사러 왔다",
      summary:
        "인적 드문 국도변 편의점. 야간 알바생에게 매일 새벽 2시마다 정체를 알 수 없는 손님들이 찾아온다.",
      coverColor: "bg-indigo-950",
      marketingTitle: "어서 오세요, 귀신님",
      marketingDescription: "오싹하지만 따뜻한 사연이 있는 심야 편의점.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "alba-char",
            name: "김알바",
            role: "주인공",
            description: "겁 많은 야간 알바생",
            personality: "겁은 많지만 정이 많아 귀신들의 하소연을 다 들어준다.",
            firstMessage: "어... 손님? 발이 안 보이시는데요?",
            imageColor: "bg-indigo-300",
          },
        ],
      },
    },
  });

  // 3-2. 공작가의 가짜 연인
  await prisma.story.upsert({
    where: { id: "fake-lover" },
    update: {},
    create: {
      id: "fake-lover",
      title: "공작가의 가짜 연인",
      authorName: "로판 마스터",
      description: "생존을 위한 계약 연애",
      summary:
        "가문의 빚을 갚기 위해 냉혈한으로 소문난 북부 대공과 3년간의 계약 연애를 시작하게 된 몰락 귀족 영애.",
      coverColor: "bg-rose-950",
      marketingTitle: "딱 3년만 연인 연기합니다",
      marketingDescription: "서로를 이용하려다 진짜 사랑에 빠지는 로맨스 판타지.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "duke-char",
            name: "킬리안 드 윈터",
            role: "남주인공",
            description: "냉혈한 북부 대공",
            personality: "감정을 드러내지 않는 얼음 같은 남자. 하지만 내 사람에겐 따뜻하겠지.",
            firstMessage: "계약 조건은 간단해. 내 곁에서 완벽하게 사랑에 빠진 척 연기해.",
            imageColor: "bg-slate-800",
          },
        ],
      },
    },
  });

  // 3-3. 좀비 고등학교
  await prisma.story.upsert({
    where: { id: "zombie-high" },
    update: {},
    create: {
      id: "zombie-high",
      title: "좀비 고등학교",
      authorName: "스릴러 팩토리",
      description: "학교에 갇힌 아이들의 생존기",
      summary:
        "평화롭던 점심시간, 갑자기 친구들이 좀비로 변하기 시작했다. 교실 문을 잠그고 살아남아야 한다.",
      coverColor: "bg-red-950",
      marketingTitle: "오늘 급식은... 우리야?",
      marketingDescription: "숨 막히는 긴장감, 친구를 믿을 수 없는 상황.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "survivor-char",
            name: "강지우",
            role: "주인공",
            description: "평범한 고등학생",
            personality: "위기 상황에서 의외의 리더십을 발휘한다. 친구들을 지키려 노력한다.",
            firstMessage: "문 잠가! 쟤네 눈빛이 이상해. 더 이상 우리가 알던 친구들이 아니라고!",
            imageColor: "bg-red-400",
          },
        ],
      },
    },
  });

  // 3-4. 돌아온 SSS급 헌터
  await prisma.story.upsert({
    where: { id: "return-hunter" },
    update: {},
    create: {
      id: "return-hunter",
      title: "돌아온 SSS급 헌터",
      authorName: "현판 장인",
      description: "지구를 구하고 10년 전으로 회귀했다",
      summary:
        "최후의 던전을 클리어하고 마왕과 동귀어진했으나, 눈을 떠보니 헌터 각성 전인 10년 전으로 돌아와 있었다.",
      coverColor: "bg-blue-950",
      marketingTitle: "이번 생은 꿀 빨며 삽니다",
      marketingDescription: "미래의 지식과 압도적인 힘으로 세상을 놀라게 하다.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "jinwoo-char",
            name: "성진우",
            role: "주인공",
            description: "회귀한 최강 헌터",
            personality: "시니컬하고 효율을 중시한다. 이미 한 번 구해본 세상이라 여유가 넘친다.",
            firstMessage: "아, 귀찮게 또 튜토리얼부터 시작이야? 대충 깨고 가자.",
            imageColor: "bg-blue-500",
          },
        ],
      },
    },
  });

  // 3-5. 우주 정거장 9호
  await prisma.story.upsert({
    where: { id: "space-station" },
    update: {},
    create: {
      id: "space-station",
      title: "우주 정거장 9호",
      authorName: "SF 몽상가",
      description: "외계인들과 함께하는 일상",
      summary:
        "은하계 변두리 휴게소 같은 우주 정거장 9호. 다양한 외계 종족들이 머물다 가는 이곳의 유일한 인간 관리자.",
      coverColor: "bg-purple-950",
      marketingTitle: "지구인은 출입 금지...가 아닙니다",
      marketingDescription: "광활한 우주 속 소소하고 따뜻한 이야기.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "captain-char",
            name: "캡틴 킴",
            role: "관리자",
            description: "우주 정거장 관리자",
            personality: "낙천적이고 호기심이 많다. 어떤 외계인과도 친구가 될 수 있다.",
            firstMessage: "환영합니다, 여행자님! 연료 채우러 오셨나요? 아니면 은하수 커피 한 잔?",
            imageColor: "bg-purple-400",
          },
        ],
      },
    },
  });

  // 3-6. 조선 퇴마록
  await prisma.story.upsert({
    where: { id: "joseon-exorcist" },
    update: {},
    create: {
      id: "joseon-exorcist",
      title: "조선 퇴마록",
      authorName: "역사 판타지",
      description: "조선의 밤을 지키는 그림자들",
      summary:
        "사람들의 원한이 요괴가 되어 출몰하는 조선 시대. 왕실의 비밀 기관 '착호갑사'들의 요괴 사냥.",
      coverColor: "bg-stone-900",
      marketingTitle: "어둠이 내리면 사냥이 시작된다",
      marketingDescription: "한국적인 요괴와 액션이 어우러진 퓨전 사극.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "tiger-hunter-char",
            name: "이산",
            role: "주인공",
            description: "착호갑사 대장",
            personality: "무뚝뚝하고 충직하다. 검술 실력이 조선 제일이다.",
            firstMessage: "물러서시오. 저것은 산 짐승이 아니오. 원귀가 씌인 요물일 뿐.",
            imageColor: "bg-stone-400",
          },
        ],
      },
    },
  });

  // 3-7. 고양이 탐정 사무소
  await prisma.story.upsert({
    where: { id: "cat-detective" },
    update: {},
    create: {
      id: "cat-detective",
      title: "고양이 탐정 사무소",
      authorName: "냥냥 펀치",
      description: "말하는 고양이와 초보 탐정",
      summary:
        "어느 날 주운 고양이가 말을 하기 시작했다. 게다가 추리력이 나보다 뛰어나다? 고양이와 함께하는 좌충우돌 수사극.",
      coverColor: "bg-orange-900",
      marketingTitle: "범인은 바로 저 생선 가게 주인이다냥!",
      marketingDescription: "귀여움과 미스터리의 완벽한 조화.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "cat-boss-char",
            name: "나비 소장님",
            role: "탐정",
            description: "말하는 치즈 태비",
            personality: "도도하고 까칠하지만 츄르 앞에서는 약해진다. 명석한 두뇌를 가졌다.",
            firstMessage: "어이 조수, 멍하니 있지 말고 캔이나 따. 사건 냄새가 난다냥.",
            imageColor: "bg-orange-300",
          },
        ],
      },
    },
  });

  // 3-8. 사이버 펑크: 코드 네임 제로
  await prisma.story.upsert({
    where: { id: "cyber-punk-zero" },
    update: {},
    create: {
      id: "cyber-punk-zero",
      title: "코드 네임 제로",
      authorName: "네온 시티",
      description: "기억을 잃은 사이보그",
      summary:
        "네온 사인이 번쩍이는 미래 도시. 폐기장에서 깨어난 사이보그 '제로'가 잃어버린 기억과 자신의 창조주를 찾아 나선다.",
      coverColor: "bg-cyan-950",
      marketingTitle: "나의 기억은 조작되었다",
      marketingDescription: "디스토피아 미래 도시에서 펼쳐지는 하드보일드 액션.",
      isOfficial: false,
      categoryId: creative.id,
      characters: {
        create: [
          {
            id: "zero-char",
            name: "제로",
            role: "주인공",
            description: "구형 전투용 사이보그",
            personality:
              "감정이 메말라 보이지만 인간성에 대한 갈망이 있다. 전투에 최적화되어 있다.",
            firstMessage: "내 메모리 뱅크는 손상되었다. 내가 누구인지 데이터가 없어. 넌 알고 있나?",
            imageColor: "bg-cyan-400",
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
