import express from "express";
import fs from "fs";
import path from "path";
import { errorHandler, successHandler } from "../utils/response.util";

const router = express.Router();

const routeFormat = /^.*\.route\..*$/;
const indexRouteFormat = /^index\.route\..*$/;

let routeCounts = 0;

const loadRoutes = (dir: string, basePath: string = "") => {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      loadRoutes(fullPath, `${basePath}/${file}`);
    } else if (routeFormat.test(file)) {
      try {
        let routePath = `${basePath}/${file.replace(routeFormat, "")}`;
        if (indexRouteFormat.test(file)) {
          routePath = basePath;
        }

        const relativePath = "./".concat(path.relative(__dirname, fullPath));
        const route = require(relativePath);

        router.use(routePath, route.default ? route.default : route);
        routeCounts++;
      } catch (error: any) {
        console.error(`Error loading route ${fullPath}`, error?.message);
      }
    }
  });
};

loadRoutes(__dirname);
console.log(`registered ${routeCounts} routes`);

router.use(errorHandler);
router.use(successHandler);

export default router;
