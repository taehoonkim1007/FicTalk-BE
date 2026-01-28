export class HeroSlideStorySnippet {
  id: string;
  title: string;
  authorName: string;
  coverColor: string;
  coverImage: string | null;
}

export class HeroSlideCharacterSnippet {
  id: string;
  name: string;
  firstMessage: string | null;
}

export class HeroSlideContent {
  marketingTitle: string;
  title: string;
  description: string;
  image: string | null;
}

export class HeroSlideResponse {
  category: string;
  story: HeroSlideStorySnippet;
  character: HeroSlideCharacterSnippet;
  slide: HeroSlideContent;
}
