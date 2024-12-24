import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { connectToDatabase } from "./utils/database.util";
import router from "./modules";
import cors from "cors";

dotenv.config();

connectToDatabase();

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

app.use(morgan(":method :url :status -  :response-time ms"));

app.use("/api/v1", router);

app.listen(8000, () => {
  console.log("App is listening on 8000");
});
