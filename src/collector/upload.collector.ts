import { v4 } from "uuid";
import { uploadFileToGithub } from "../utils/github.util.js";
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

  const uploadUUID = "b34cb8dd-9f58-48cf-89a3-a33ba6a55b99";
  // const uploadUUID = v4();

  const filePath =
    "/Users/ppegu/Projects/Yaalo/yaalo-be/tmp/b34cb8dd-9f58-48cf-89a3-a33ba6a55b99";

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
