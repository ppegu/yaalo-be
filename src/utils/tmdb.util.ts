import axios from "axios";
import Logger from "./Logger";

export type TmdbMovie = {
  title: string;
  description: string;
  releaseDate: Date;
  poster: string;
  genres: string[] | undefined;
  duration: number;
  isTv?: boolean;
};

const logger = Logger.createLogger("tmdb");

const apiKey = process.env.TMDB_API_KEY;

const BASE_URL = "https://api.themoviedb.org/3";

const Api = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: apiKey,
  },
});

export const TMDB_URLS = {
  FIND_BY_EXTERNAL_ID: "/find/:external_id?external_source=:external_source",
  GET_MOVIE_DETAILS: "/movie/:movie_id",
  GET_TV_SERIES_DETAILS: "/tv/:series_id",
};

export default class Tmdb {
  static async getTmdbDetailsById(
    tmdbId: string,
    isTv?: boolean
  ): Promise<TmdbMovie> {
    const url = isTv
      ? `${TMDB_URLS.GET_TV_SERIES_DETAILS.replace(":series_id", tmdbId)}`
      : `${TMDB_URLS.GET_MOVIE_DETAILS.replace(":movie_id", tmdbId)}`;

    const { data } = await Api.get(url);

    const releaseDate = data.release_date || data.first_air_date;

    return {
      title: data.title || data.name,
      description: data.overview,
      ...(releaseDate && {
        releaseDate: new Date(releaseDate),
      }),
      poster: `https://image.tmdb.org/t/p/original${data.poster_path}`,
      genres: data.genres?.map((genre: { name: string }) => genre.name),
      duration: data.runtime || 0,
      isTv,
    };
  }

  static async getMovieDetailsByImdbId(imdbId: string) {
    try {
      const url = `${TMDB_URLS.FIND_BY_EXTERNAL_ID.replace(
        ":external_id",
        imdbId
      ).replace(":external_source", "imdb_id")}`;

      const { data } = await Api.get(url);

      const tmdbId = data?.movie_results?.[0]?.id || data?.tv_results?.[0]?.id;

      const isTv = !!data?.tv_results?.[0]?.id;

      if (!tmdbId) {
        throw new Error("Movie not found on TMDB.");
      }

      return this.getTmdbDetailsById(tmdbId, isTv);
    } catch (error) {
      logger.error("Error getting movie details from TMDB:", error);
      throw new Error("Error getting movie details from TMDB.");
    }
  }
}

export async function getMovieDetailsFromTmdb(
  movieTitle: string
): Promise<TmdbMovie> {
  const url =
    "https://api.themoviedb.org/3/find/tt14948432?external_source=imdb_id";

  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    movieTitle
  )}`;
  const searchResponse = await axios.get(searchUrl);
  const searchData = searchResponse.data;

  if (searchData.results.length === 0) {
    throw new Error("Movie not found on TMDB.");
  }

  const movieId = searchData.results[0].id;
  const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`;
  const detailsResponse = await axios.get(detailsUrl);
  const movieDetails = detailsResponse.data;

  if (!movieDetails) {
    throw new Error("Movie details not found.");
  }

  // console.log("Movie details from TMDB:", movieDetails);

  return {
    title: movieDetails.title,
    description: movieDetails.overview,
    ...(movieDetails.release_date && {
      releaseDate: new Date(movieDetails.release_date),
    }),
    poster: `https://image.tmdb.org/t/p/original${movieDetails.poster_path}`,
    genres: movieDetails.genres?.map((genre: { name: string }) => genre.name),
    duration: movieDetails.runtime,
  };
}
