import { IHomeCard } from "../../@types/home";
import { IMovie } from "../../@types/movie";
import movieService from "../movie/movie.service";

async function getHomeCards(userId: any, dummyCards: IHomeCard<IMovie>[]) {
  const cards: IHomeCard<IMovie>[] = [];

  for (const card of dummyCards) {
    switch (card.id) {
      case "continue-watching":
        let watchingMovies = await movieService.getContinueWatchingMovies(
          userId
        );
        if (watchingMovies.length)
          cards.push({
            ...card,
            movies: watchingMovies,
          });
        break;
      case "popular-movies":
        const popularMovies = await movieService.getPopularMovies(10);
        cards.push({
          ...card,
          movies: popularMovies,
        });
      default:
        break;
    }
  }
  return cards;
}

export default {
  getHomeCards,
};
