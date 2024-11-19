import axios from "axios";

export async function getMovieDetailsFromTmdb(movieTitle: string) {
  const apiKey = process.env.TMDB_API_KEY;

  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    movieTitle
  )}`;
  const searchResponse = await axios.get(searchUrl);
  const searchData = searchResponse.data;

  if (searchData.results.length === 0) {
    console.error("Movie not found on TMDB.");
    return;
  }

  const movieId = searchData.results[0].id;
  const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`;
  const detailsResponse = await axios.get(detailsUrl);
  const movieDetails = detailsResponse.data;

  return {
    title: movieDetails?.original_title,
    description: movieDetails?.overview,
    releaseDate: movieDetails?.release_date,
  };
}
