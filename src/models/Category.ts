import { Schema, model, Document } from "mongoose";
import * as yup from "yup";

export interface ICategory extends Document {
  name: string;
  description: string;
  banner: string;
  status: "active" | "inactive";
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    banner: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Category = model<ICategory>("Category", CategorySchema);

export default Category;

export const categoryValidationSchema = yup.object().shape({
  name: yup.string().required().trim(),
  banner: yup.string().required().trim(),
  description: yup.string().trim(),
  status: yup.mixed().oneOf(["active", "inactive"]).default("active"),
});
