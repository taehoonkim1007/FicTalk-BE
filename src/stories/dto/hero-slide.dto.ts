export interface HeroSlideResponse {
  category: string;
  story: {
    id: string;
    title: string;
    authorName: string;
    coverColor: string;
  };
  character: {
    id: string;
    name: string;
    firstMessage: string | null;
  };
  slide: {
    title: string;
    description: string;
    image: string;
  };
}
