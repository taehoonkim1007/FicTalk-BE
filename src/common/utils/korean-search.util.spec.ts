import {
  englishToKorean,
  generateSearchVariations,
  removeSpaces,
  transliterate,
  transliterateByPrefix,
} from "./korean-search.util";

describe("englishToKorean", () => {
  it("영어 키보드 입력을 한글로 변환한다", () => {
    expect(englishToKorean("rocmql")).toBe("개츠비");
    expect(englishToKorean("dkssud")).toBe("안녕");
    expect(englishToKorean("gksrmf")).toBe("한글");
  });

  it("영어가 아닌 입력은 그대로 반환한다", () => {
    expect(englishToKorean("한글")).toBe("한글");
    expect(englishToKorean("123")).toBe("123");
    expect(englishToKorean("test123")).toBe("test123");
  });

  it("빈 문자열은 그대로 반환한다", () => {
    expect(englishToKorean("")).toBe("");
  });
});

describe("removeSpaces", () => {
  it("띄어쓰기를 제거한다", () => {
    expect(removeSpaces("어린 왕자")).toBe("어린왕자");
    expect(removeSpaces("great gatsby")).toBe("greatgatsby");
  });

  it("연속된 띄어쓰기를 모두 제거한다", () => {
    expect(removeSpaces("a  b   c")).toBe("abc");
  });

  it("띄어쓰기가 없으면 그대로 반환한다", () => {
    expect(removeSpaces("test")).toBe("test");
  });
});

describe("transliterate", () => {
  it("영어 음역 사전에서 한글을 반환한다", () => {
    expect(transliterate("gatsby")).toBe("개츠비");
    expect(transliterate("sherlock")).toBe("셜록");
    expect(transliterate("demian")).toBe("데미안");
  });

  it("대소문자를 구분하지 않는다", () => {
    expect(transliterate("GATSBY")).toBe("개츠비");
    expect(transliterate("Gatsby")).toBe("개츠비");
  });

  it("사전에 없으면 null을 반환한다", () => {
    expect(transliterate("unknown")).toBeNull();
    expect(transliterate("한글")).toBeNull();
  });
});

describe("transliterateByPrefix", () => {
  it("prefix로 매칭되는 모든 한글을 반환한다", () => {
    const results = transliterateByPrefix("ga");
    expect(results).toContain("개츠비");
    expect(results).toContain("위대한 개츠비");
  });

  it("단어 시작으로 매칭한다", () => {
    const results = transliterateByPrefix("g");
    expect(results).toContain("개츠비");
    expect(results).toContain("위대한 개츠비");
    expect(results).toContain("그레고르");
    expect(results).toContain("그레테");
  });

  it("대소문자를 구분하지 않는다", () => {
    const results = transliterateByPrefix("GA");
    expect(results).toContain("개츠비");
  });

  it("매칭되는 것이 없으면 빈 배열을 반환한다", () => {
    expect(transliterateByPrefix("xyz")).toEqual([]);
  });
});

describe("generateSearchVariations", () => {
  it("원본을 포함한다", () => {
    const variations = generateSearchVariations("test");
    expect(variations).toContain("test");
  });

  it("띄어쓰기 제거 버전을 포함한다", () => {
    const variations = generateSearchVariations("어린 왕자");
    expect(variations).toContain("어린 왕자");
    expect(variations).toContain("어린왕자");
  });

  it("영어를 한글로 변환한 버전을 포함한다", () => {
    const variations = generateSearchVariations("rocmql");
    expect(variations).toContain("rocmql");
    expect(variations).toContain("개츠비");
  });

  it("영어 음역 사전 매칭을 포함한다", () => {
    const variations = generateSearchVariations("gatsby");
    expect(variations).toContain("gatsby");
    expect(variations).toContain("개츠비");
  });

  it("prefix 매칭 결과를 포함한다", () => {
    const variations = generateSearchVariations("dem");
    expect(variations).toContain("dem");
    expect(variations).toContain("데미안");
  });

  it("빈 문자열은 빈 배열을 반환한다", () => {
    expect(generateSearchVariations("")).toEqual([]);
    expect(generateSearchVariations("   ")).toEqual([]);
  });

  it("중복을 제거한다", () => {
    const variations = generateSearchVariations("gatsby");
    const uniqueVariations = [...new Set(variations)];
    expect(variations).toEqual(uniqueVariations);
  });
});
