import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Movie from "../../models/Movie";
import createMulterStorage from "../../utils/multer.util";
import { NotFoundError } from "../../utils/response.util";

const router = express.Router();

const upload = createMulterStorage({ folderName: "movies" });

// Create a new movie
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newMovie = new Movie(req.body);
    await newMovie.save();
    res.status(201).json(newMovie);
  } catch (error: any) {
    next(error);
  }
});

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
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      throw new NotFoundError("Movie not found");
    }
    res.json(movie);
  } catch (error: any) {
    next(error);
  }
});

// Update a movie by ID
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedMovie) {
      throw new NotFoundError("Movie not found");
    }
    res.json(updatedMovie);
  } catch (error: any) {
    next(error);
  }
});

// Delete a movie by ID
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
      if (!deletedMovie) {
        throw new NotFoundError("Movie not found");
      }
      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  }
);

// Upload screenshots for a movie
router.post(
  "/:id/screenshots",
  upload.array("screenshots"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const movie = await Movie.findById(req.params.id);
      if (!movie) {
        throw new NotFoundError("Movie not found");
      }
      const screenshots = req.files as Express.Multer.File[];
      movie.screenshots.push(...screenshots.map((file) => file.path));
      await movie.save();
      res.json(movie);
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
