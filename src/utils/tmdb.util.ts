import axios from "axios";

export type TmdbMovie = {
  title: string;
  description: string;
  releaseDate: Date;
  poster: string;
  genres: string[] | undefined;
};

export async function getMovieDetailsFromTmdb(
  movieTitle: string
): Promise<TmdbMovie> {
  const apiKey = process.env.TMDB_API_KEY;

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

  return {
    title: movieDetails.title,
    description: movieDetails.overview,
    releaseDate: new Date(movieDetails.release_date),
    poster: `https://image.tmdb.org/t/p/original${movieDetails.poster_path}`,
    genres: movieDetails.genres?.map((genre: { name: string }) => genre.name),
  };
}
