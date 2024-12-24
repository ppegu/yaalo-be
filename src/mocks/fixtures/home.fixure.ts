import { IHomeCard } from "../../@types/home";

const homeCards: IHomeCard<any>[] = [
  {
    id: "continue-watching",
    title: "Continue Watching",
    cardHeight: 200,
    cardWidth: 150,
    cardSpacing: 10,
    topSpacing: 30,
    seeAllRoute: "ContinueWatching",
    movies: [],
  },
  {
    id: "popular-movies",
    title: "Popular Movies",
    cardHeight: 200,
    cardWidth: 150,
    cardSpacing: 10,
    topSpacing: 30,
    seeAllRoute: "Tranding",
    movies: [],
  },
];

export default {
  homeCards,
};
