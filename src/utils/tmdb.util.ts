import axios from "axios";

export async function getMovieDetailsFromTmdb(movieTitle: string) {
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

  // console.log("movieDetails", movieDetails);

  return {
    title: movieDetails?.title,
    description: movieDetails?.overview,
    releaseDate: movieDetails?.release_date,
  };
}
