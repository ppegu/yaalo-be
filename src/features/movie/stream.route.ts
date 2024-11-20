import { Router } from "express";
import fs from "fs";
import path from "path";
import Movie from "../../models/Movie";
import { downloadFileFromGithub } from "../../utils/github.util";
import Logger from "../../utils/Logger";
import { NotFoundError } from "../../utils/response.util";
import { streamVideo } from "../../utils/stream.util";

const logger = Logger.createLogger("movie.stream.route");

const router = Router();

router.get("/:id", async (req, res, next) => {
  try {
    const movieId = req.params.id;
    const { type } = req.query;

    // Get the movie from the database
    const movie = await Movie.findOne({ _id: movieId }).lean();

    if (!movie) {
      throw new NotFoundError("Movie not found");
    }

    let streamingLink = movie.streamingLink;
    let streamExists = streamingLink ? fs.existsSync(streamingLink) : false;
    let fileSize = streamExists ? fs.statSync(streamingLink!).size : 0;

    const updatedDoc: any = {
      lastStreamedAt: new Date(),
    };

    if (!streamExists) {
      const downloadLink = movie.downloadLinks.find(
        (link) => link.type === type
      );

      if (!downloadLink) {
        throw new NotFoundError("Stream link not found");
      }

      streamingLink = path.join(__dirname, `../../../tmp/${movieId}`);
      const dir = path.dirname(streamingLink);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (type === "git") {
        const metadata = await downloadFileFromGithub(
          downloadLink.url,
          streamingLink
        );
        fileSize = metadata.fileSize;

        // update the movie streaming link
        updatedDoc.streamingLink = streamingLink;
      }
    }

    if (fileSize === 0 || !streamingLink) {
      logger.error(
        "Streaming file size is",
        fileSize,
        "streaming link is",
        streamingLink
      );
      throw new NotFoundError("Streaming error occurred");
    }

    // update the last streamed at date
    await Movie.updateOne({ _id: movieId }, updatedDoc);

    // Stream the video from streaming link
    await streamVideo({ filePath: streamingLink }, req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
