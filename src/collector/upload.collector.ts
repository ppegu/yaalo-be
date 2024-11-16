import { uploadUrlToAzure } from "../utils/azure.util";
import Logger from "../utils/Logger";

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

  const azureUrl = await uploadUrlToAzure(
    "movies",
    downloadLink,
    imdbDetails.title,
    imdbDetails.title
  );

  logger.log("Movie uploaded to Azure", { azureUrl });
}
