import { CheerioAPI } from "cheerio";
import Logger from "../../utils/Logger";
import Tmdb, {
  getMovieDetailsFromTmdb,
  TmdbMovie,
} from "../../utils/tmdb.util";

const logger = Logger.createLogger("get1CineVoodMovieInfo");

export default async function get1CineVoodMovieInfo(
  $: CheerioAPI
): Promise<TmdbMovie> {
  let imdbTitleUrl = $(".imdb_container #movie_title a").attr("href");

  const urlParts = imdbTitleUrl?.split("/");

  const imdbId = urlParts?.[urlParts.length - 1];

  if (imdbId) {
    const info = await Tmdb.getMovieDetailsByImdbId(imdbId);
    return info;
  }

  let title = $(".imdb_container #movie_title").text();

  if (!title) {
    const articleDescription = $(
      "p:contains('Qualities For Your Mobile/tablet/Computer')"
    );

    const spanElement = articleDescription.find("span").first();
    title = spanElement.text();
  }

  if (!title) {
    throw new Error("movie title not found!!");
  }

  // get the details from TMDB
  logger.log("Getting movie details from TMDB:", title);
  const movieInfo = await Tmdb.getMovieDetailsByImdbId(title);

  return movieInfo;
}
