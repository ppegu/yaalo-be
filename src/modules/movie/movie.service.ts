import { IMovie } from "../../@types/movie";
import ContinueWatching from "../../models/ContinueWatching";
import { Movie } from "../../models/MovieModels";
import Logger from "../../utils/Logger";

const logger = Logger.createLogger("movie.service");

async function getContinueWatchingMovies(userId: any) {
  try {
    const watching = await ContinueWatching.find({ userId })
      .populate("movie")
      .lean();

    const movies: IMovie[] = watching.map((watch) => watch.movie as IMovie);

    return movies;
  } catch (error) {
    logger.error("Error while fetching continue watching movies", error);
    return [];
  }
}

async function getPopularMovies(limit: number = 10) {
  const movies = await Movie.find()
    .sort({ playCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return movies as IMovie[];
}

export default {
  getContinueWatchingMovies,
  getPopularMovies,
};
