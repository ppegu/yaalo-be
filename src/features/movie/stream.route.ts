import { Router } from "express";
import Movie from "../../models/Movie";
import { NotFoundError } from "../../utils/response.util";
import { streamFileFromGithub } from "../../utils/github.util";
import { streamVideo } from "../../utils/stream.util";

const router = Router();

router.get("/:id", async (req, res, next) => {
  try {
    const movieId = req.params.id;

    // Get the movie from the database
    const movie = await Movie.findOne({ _id: movieId }).lean();

    if (!movie) {
      throw new NotFoundError("Movie not found");
    }

    const { type } = req.query;

    const downloadLink = movie.downloadLinks.find((link) => link.type === type);

    if (!downloadLink) {
      throw new NotFoundError("Stream link not found");
    }

    await streamFileFromGithub(downloadLink.url, req, res);

    // await streamVideo(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
