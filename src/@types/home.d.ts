export type IHomeCard<T> = {
  id: string;
  title: string;
  movies: T[];
  cardHeight: number;
  cardWidth: number;
  cardSpacing: number;
  topSpacing: number;
  seeAllRoute?: "ContinueWatching" | "Tranding";
};
