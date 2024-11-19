import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { connectToDatabase } from "./utils/database.util";
import router from "./features";

dotenv.config();

connectToDatabase();

const app = express();

app.use(express.json());

app.use(morgan(":method :url :status -  :response-time ms"));

app.use(router);

app.listen(8000, () => {
  console.log("App is listening on 8000");
});
