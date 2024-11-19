import express from "express";
import fs from "fs";
import path from "path";
import { errorHandler, successHandler } from "../utils/response.util";

const router = express.Router();

const routeFormat = /^.*\.route\..*$/;
const indexRouteFormat = /^index\.route\..*$/;

let routeCounts = 0;

function registerRoutes(file: string, fullPath: string, basePath: string = "") {
  try {
    let routePath = `${basePath}/${file.replace(/.route\..*$/, "")}`;

    if (indexRouteFormat.test(file)) {
      routePath = basePath;
    }
    const relativePath = "./".concat(path.relative(__dirname, fullPath));

    const route = require(relativePath);

    router.use(routePath, route.default ? route.default : route);
    routeCounts++;
  } catch (error: any) {
    throw error;
  }
}

const loadRoutes = (dir: string, basePath: string = "") => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadRoutes(fullPath, `${basePath}/${file}`);
    } else if (routeFormat.test(file)) {
      registerRoutes(file, fullPath, basePath);
    }
  }
};

loadRoutes(__dirname);
console.log(`registered ${routeCounts} routes`);

router.use(errorHandler);
router.use(successHandler);

export default router;
