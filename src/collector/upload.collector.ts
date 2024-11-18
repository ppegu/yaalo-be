import { v4 } from "uuid";
import { uploadFileToGithub } from "../utils/github.util";
import Logger from "../utils/Logger";
import { downloadFileFromURL } from "../utils/download.util";
import Movie from "../models/Movie";

export type MovieDetails = {
  bannerLink: string;
  downloadLink: string;
  screenshots: string[];
  imdbDetails:
    | {
        title: any;
        description: any;
        releaseDate: any;
      }
    | undefined;
};

const logger = Logger.createLogger("upload.collector");

export async function uploadMovieFromCollector(movieDetails: MovieDetails) {
  const { downloadLink, imdbDetails } = movieDetails;

  logger.log("uploadig movie from collector", { title: imdbDetails?.title });

  if (!imdbDetails) {
    logger.error("IMDB details not found for movie", { imdbDetails });
    return;
  }

  const uploadUUID = v4();

  const filePath =
    "/Users/ppegu/Projects/Yaalo/yaalo-be/tmp/8e8bcc7b-0106-4795-aa18-c697f6897c30";

  logger.log("file downloaded", { filePath, uploadUUID });

  const repo = `ffegu0418/${uploadUUID}`;

  await uploadFileToGithub(repo, filePath);

  // now store info in db

  logger.log("storaing movie to db", { title: imdbDetails.title });

  const movie = new Movie({
    title: imdbDetails.title,
    description: imdbDetails.description,
    releaseDate: imdbDetails.releaseDate,
    downloadLinks: [{ type: "git", url: repo }],
    screenshots: movieDetails.screenshots,
    status: "active",
  });

  await movie.save();
}
