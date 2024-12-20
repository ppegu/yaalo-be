import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { DownloadLink, Movie } from "../../models/MovieModels";
import { convertFileSize } from "../../utils/file.util";
import { AppResponse, NotFoundError } from "../../utils/response.util";

const router = express.Router();

// Get all movies
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error: any) {
    next(error);
  }
});

// Get a single movie by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: movieId } = req.params;

    if (!movieId) {
      throw new NotFoundError("Movie ID is required");
    }

    const movie = await Movie.findById(movieId);

    if (!movie) {
      throw new NotFoundError("Movie not found");
    }

    res.json(movie);
  } catch (error: any) {
    next(error);
  }
});

router.get(
  "/:movieId/qualities",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { movieId } = req.params;

      if (!movieId) {
        throw new NotFoundError("Movie ID is required");
      }

      const movie = await Movie.findById(movieId);

      if (!movie) {
        throw new NotFoundError("Movie not found");
      }

      const downloadLinks = await DownloadLink.find({ movieId });

      const qualities = downloadLinks.map((link) => ({
        quality: link.quality,
        qualityId: link._id,
        size: convertFileSize(link.size, link.unit, "B"),
        unit: "B",
      }));

      next(
        new AppResponse(200, "Qualities fetched successfully", { qualities })
      );
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
