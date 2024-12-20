import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Category from "../../models/Category";
import createMulterStorage from "../../utils/multer.util";
import { AppResponse, BadRequestError } from "../../utils/response.util";

const router = Router();

const upload = createMulterStorage({ folderName: "category" });

// Create a new category
router.post(
  "/",
  upload.single("banner"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = req.body;

      if (!req.file) {
        throw new BadRequestError("Banner is required");
      }

      const banner = req.file.path;

      const category = await Category.create({
        name,
        description,
        banner,
      });

      next(new AppResponse(200, "Category created", category));
    } catch (error: any) {
      next(error);
    }
  }
);

// Read a category by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      throw new BadRequestError("Category not found");
    }

    next(new AppResponse(200, "Category retrieved", category));
  } catch (error: any) {
    next(error);
  }
});

// Update a category by ID
router.put(
  "/:id",
  upload.single("banner"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const updateData: any = { name, description };

      if (req.file) {
        updateData.banner = req.file.path;
      }

      const category = await Category.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      if (!category) {
        throw new BadRequestError("Category not found");
      }

      next(new AppResponse(200, "Category updated", category));
    } catch (error: any) {
      next(error);
    }
  }
);

// Delete a category by ID
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await Category.findByIdAndDelete(id);

      if (!category) {
        throw new BadRequestError("Category not found");
      }

      next(new AppResponse(200, "Category deleted"));
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
