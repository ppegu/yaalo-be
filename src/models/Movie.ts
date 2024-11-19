import mongoose, { Document, Schema } from "mongoose";
import * as yup from "yup";
import type { ICategory } from "./Category";

interface IMovie {
  title: string;
  description: string;
  releaseDate: string;
  category?: ICategory;
  screenshots: string[];
  downloadLinks: { type: string; url: string }[];
  status: "active" | "inactive";
}

const schema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    releaseDate: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    screenshots: { type: [String], required: true },
    downloadLinks: { type: [], required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

const Movie = mongoose.model<IMovie>("Movie", schema);

export default Movie;

export const movieValidationSchema = yup.object().shape({
  title: yup.string().required(),
  description: yup.string().required(),
  releaseDate: yup.number().required(),
  downloadLinks: yup.array().required(),
});
