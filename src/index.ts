import express from "express";
import router from "./features";

const app = express();

app.use(express.json());

app.use(router);

app.listen(8000, () => {
  console.log("App is listening on 8000");
});
