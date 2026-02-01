/**
 * 검색어 변환 유틸리티
 * - 한영 변환: 영어 키보드 입력 → 한글
 * - 띄어쓰기 제거
 * - 영어 음역 사전
 */

// ============ 영어 → 한글 키보드 매핑 ============
const EN_TO_KO: Record<string, string> = {
  // 자음
  r: "ㄱ",
  R: "ㄲ",
  s: "ㄴ",
  e: "ㄷ",
  E: "ㄸ",
  f: "ㄹ",
  a: "ㅁ",
  q: "ㅂ",
  Q: "ㅃ",
  t: "ㅅ",
  T: "ㅆ",
  d: "ㅇ",
  w: "ㅈ",
  W: "ㅉ",
  c: "ㅊ",
  z: "ㅋ",
  x: "ㅌ",
  v: "ㅍ",
  g: "ㅎ",
  // 모음
  k: "ㅏ",
  o: "ㅐ",
  i: "ㅑ",
  O: "ㅒ",
  j: "ㅓ",
  p: "ㅔ",
  u: "ㅕ",
  P: "ㅖ",
  h: "ㅗ",
  y: "ㅛ",
  n: "ㅜ",
  b: "ㅠ",
  m: "ㅡ",
  l: "ㅣ",
};

// 초성, 중성, 종성 리스트
const CHOSUNG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const JUNGSUNG = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];
const JONGSUNG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

// 복합 모음 매핑
const COMPLEX_JUNGSUNG: Record<string, string> = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
};

// 복합 종성 매핑
const COMPLEX_JONGSUNG: Record<string, string> = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
};

// ============ 영어 음역 사전 (seed.ts 기반) ============
const TRANSLITERATION_MAP: Record<string, string> = {
  // 작품명
  "little prince": "어린 왕자",
  "the little prince": "어린 왕자",
  "great gatsby": "위대한 개츠비",
  "the great gatsby": "위대한 개츠비",
  gatsby: "개츠비",
  "1984": "1984",
  demian: "데미안",
  metamorphosis: "변신",
  "pride and prejudice": "오만과 편견",
  "sherlock holmes": "셜록 홈즈",
  sherlock: "셜록",
  "the old man and the sea": "노인과 바다",

  // 작가명
  "saint-exupery": "생텍쥐페리",
  exupery: "생텍쥐페리",
  fitzgerald: "피츠제럴드",
  "george orwell": "조지 오웰",
  orwell: "오웰",
  "hermann hesse": "헤르만 헤세",
  hesse: "헤세",
  kafka: "카프카",
  "jane austen": "제인 오스틴",
  austen: "오스틴",
  "conan doyle": "코난 도일",
  hemingway: "헤밍웨이",

  // 캐릭터명 - 어린 왕자
  fox: "여우",
  rose: "장미",
  snake: "뱀",

  // 캐릭터명 - 위대한 개츠비
  "jay gatsby": "제이 개츠비",
  "nick carraway": "닉 캐러웨이",
  nick: "닉",
  "daisy buchanan": "데이지 뷰캐넌",
  daisy: "데이지",
  "tom buchanan": "톰 뷰캐넌",
  tom: "톰",
  "jordan baker": "조던 베이커",
  jordan: "조던",

  // 캐릭터명 - 1984
  "winston smith": "윈스턴 스미스",
  winston: "윈스턴",
  julia: "줄리아",
  "o'brien": "오브라이언",
  obrien: "오브라이언",

  // 캐릭터명 - 데미안
  "emil sinclair": "에밀 싱클레어",
  emil: "에밀",
  sinclair: "싱클레어",
  "max demian": "막스 데미안",
  "eva": "에바",
  pistorius: "피스토리우스",
  kromer: "크로머",

  // 캐릭터명 - 변신
  "gregor samsa": "그레고르 잠자",
  gregor: "그레고르",
  samsa: "잠자",
  grete: "그레테",

  // 캐릭터명 - 오만과 편견
  "elizabeth bennet": "엘리자베스 베넷",
  elizabeth: "엘리자베스",
  "mr. darcy": "다아시",
  darcy: "다아시",
  "jane bennet": "제인 베넷",
  jane: "제인",
  "charles bingley": "찰스 빙리",
  bingley: "빙리",
  wickham: "위컴",
  collins: "콜린스",

  // 캐릭터명 - 셜록 홈즈
  holmes: "홈즈",
  "irene adler": "아이린 애들러",
  irene: "아이린",
  "john watson": "존 왓슨",
  watson: "왓슨",

  // 캐릭터명 - 노인과 바다
  santiago: "산티아고",
  manolin: "마놀린",
};

/**
 * 영어 키보드 입력을 한글 자모로 변환
 */
function toJamo(text: string): string[] {
  return text.split("").map((char) => EN_TO_KO[char] || char);
}

/**
 * 자모가 초성인지 확인
 */
function isChosung(char: string): boolean {
  return CHOSUNG.includes(char);
}

/**
 * 자모가 중성인지 확인
 */
function isJungsung(char: string): boolean {
  return JUNGSUNG.includes(char);
}

/**
 * 자모를 완성형 한글로 조합
 */
function composeHangul(jamos: string[]): string {
  let result = "";
  let i = 0;

  while (i < jamos.length) {
    const cho = jamos[i];

    // 초성이 아니면 그대로 추가
    if (!isChosung(cho)) {
      result += cho;
      i++;
      continue;
    }

    // 다음이 중성인지 확인
    if (i + 1 >= jamos.length || !isJungsung(jamos[i + 1])) {
      result += cho;
      i++;
      continue;
    }

    // 중성 처리 (복합 모음 확인)
    let jung = jamos[i + 1];
    let jungLen = 1;

    if (i + 2 < jamos.length) {
      const combined = jung + jamos[i + 2];
      if (COMPLEX_JUNGSUNG[combined]) {
        jung = COMPLEX_JUNGSUNG[combined];
        jungLen = 2;
      }
    }

    // 종성 처리
    let jong = "";
    let jongLen = 0;
    const nextIdx = i + 1 + jungLen;

    if (nextIdx < jamos.length && isChosung(jamos[nextIdx])) {
      const nextChar = jamos[nextIdx];
      const afterNext = jamos[nextIdx + 1];

      // 다음 글자가 중성이면 종성으로 사용하지 않음
      if (afterNext && isJungsung(afterNext)) {
        // 종성 없음
      } else {
        // 복합 종성 확인
        if (afterNext && isChosung(afterNext)) {
          const combined = nextChar + afterNext;
          const afterCombined = jamos[nextIdx + 2];

          if (
            COMPLEX_JONGSUNG[combined] &&
            (!afterCombined || !isJungsung(afterCombined))
          ) {
            jong = COMPLEX_JONGSUNG[combined];
            jongLen = 2;
          } else if (!afterCombined || !isJungsung(afterCombined)) {
            jong = nextChar;
            jongLen = 1;
          }
        } else {
          jong = nextChar;
          jongLen = 1;
        }
      }
    }

    // 완성형 한글 조합
    const choIdx = CHOSUNG.indexOf(cho);
    const jungIdx = JUNGSUNG.indexOf(jung);
    const jongIdx = jong ? JONGSUNG.indexOf(jong) : 0;

    if (choIdx >= 0 && jungIdx >= 0) {
      const code = 0xac00 + choIdx * 588 + jungIdx * 28 + jongIdx;
      result += String.fromCharCode(code);
    } else {
      result += cho;
    }

    i += 1 + jungLen + jongLen;
  }

  return result;
}

/**
 * 영어 키보드 입력을 한글로 변환
 * 예: "rocmql" → "개츠비"
 */
export function englishToKorean(text: string): string {
  if (!/^[a-zA-Z]+$/.test(text)) {
    return text;
  }
  const jamos = toJamo(text);
  return composeHangul(jamos);
}

/**
 * 띄어쓰기 제거
 */
export function removeSpaces(text: string): string {
  return text.replace(/\s+/g, "");
}

/**
 * 영어 음역 사전에서 한글 검색
 */
export function transliterate(text: string): string | null {
  return TRANSLITERATION_MAP[text.toLowerCase()] || null;
}

/**
 * 검색어에서 모든 변환 버전 생성 (중복 제거)
 */
export function generateSearchVariations(query: string): string[] {
  const variations = new Set<string>();
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  // 1. 원본
  variations.add(trimmed);

  // 2. 띄어쓰기 제거
  const noSpaces = removeSpaces(trimmed);
  if (noSpaces !== trimmed) {
    variations.add(noSpaces);
  }

  // 3. 한영 변환
  const korean = englishToKorean(trimmed);
  if (korean !== trimmed) {
    variations.add(korean);
  }

  // 4. 영어 음역 사전
  const transliterated = transliterate(trimmed);
  if (transliterated) {
    variations.add(transliterated);
  }

  return Array.from(variations);
}
