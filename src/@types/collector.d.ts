import { TmdbMovie } from "../utils/tmdb.util";

export type DownloadLinkInfo = {
  links: string[];
  sentence: string;
  size: number;
  unit: string;
  sizeInMB: number;
};

export type ScrappedMovie = {
  downloadLinks: DownloadLinkInfo[];
  movieInfo: TmdbMovie;
};
