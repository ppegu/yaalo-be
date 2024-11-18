import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectToDatabase() {
  const dbUri = process.env.MONGODB_URI;

  if (!dbUri) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
  }

  try {
    await mongoose.connect(dbUri, {});
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}
