import { Option, program } from "commander";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { connectToDatabase } from "../utils/database.util";
import CineVood from "./1cinevood";
import movies4u from "./movies4u";

dotenv.config();

program
  .addOption(
    new Option("-p, --provider <type>")
      .choices(["cinevood", "movies4u"])
      .makeOptionMandatory()
  )
  .requiredOption("-l, --link <type>", "link of provider")
  .addOption(new Option("-d, --debug", "output extra debugging"));

program.parse(process.argv);

const options = program.opts();

console.log("Options: ", options);

async function startProcess() {
  await connectToDatabase();

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: !options.debug,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Browser launched.");

  const link = options.link;

  if (options.provider === "cinevood") {
    const cinevood = new CineVood(link);
    await cinevood.startScrapping(browser);
  } else if (options.provider === "movies4u") {
    await movies4u.startScrapping(browser, link);
  }

  console.log("closing browser...");
  await browser.close();

  process.exit(0);
}

startProcess();
