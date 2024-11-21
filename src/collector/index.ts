import { Option, program } from "commander";
import dotenv from "dotenv";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";
import { connectToDatabase } from "../utils/database.util";
import { getMovieDetailsFromTmdb } from "../utils/tmdb.util";
import { getHubcloudDownloadLink } from "./hubcloud.collector";
import movies4u from "./movies4u";
import { uploadMovieFromCollector } from "./upload.collector";
import { selectDownloadableLink } from "./collector.util";

dotenv.config();

async function extractMovieDetails(page: Page) {
  const title = await page.evaluate(() => {
    const title = document.querySelector("#movie_title");
    return title?.textContent;
  });

  if (!title) {
    console.log("Title not found.");
    return;
  }

  const details = await getMovieDetailsFromTmdb(title);

  return details;
}

async function handleSinglePostDownload(
  browser: Browser,
  link: { href: string; bannerLink?: string }
) {
  const { href: url, bannerLink } = link;

  console.log("Opening new page...");
  const page = await browser.newPage();
  console.log("New page opened.");

  console.log(`Navigating to URL: ${url}`);
  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  console.log("Navigation complete.");

  await page.waitForSelector(".post-single-content");

  const imdbDetails = await extractMovieDetails(page);

  const centerTag = await page.$(".post-single-content center");
  const paragraphs = await centerTag?.$$("p");
  const secondParagraph = paragraphs?.[1];

  let screenshots: string[] = [];

  if (secondParagraph) {
    const images = await secondParagraph.$$("img");
    screenshots = await Promise.all(
      images.map((img) => page.evaluate((img) => img.src, img))
    );
  }

  const h6Elements = await centerTag?.$$("h6")!;
  const downloadTitles = await Promise.all(
    h6Elements.map((h6) => page.evaluate((h6) => h6.innerText, h6))
  );

  const downloadableTitleIndex = selectDownloadableLink(downloadTitles);

  if (downloadableTitleIndex === -1) {
    console.log("No download link found.");
  }

  const downloadableTitleElement = h6Elements[downloadableTitleIndex];

  const downloadableText = await page.evaluate(
    (el) => el.innerText,
    downloadableTitleElement
  );
  console.log("Downloadable link text:", downloadableText);

  const downloadableParagraph = await downloadableTitleElement?.evaluateHandle(
    (el) => el.nextElementSibling
  );

  const downloadLinksElements = await downloadableParagraph
    ?.asElement()
    ?.$$("a");

  if (!downloadLinksElements) {
    console.log("No download links found.");
    return;
  }

  const downloadLinks = await Promise.all(
    downloadLinksElements.map((a: any) => page.evaluate((a) => a.href, a))
  );
  console.log("Downloadable link hrefs:", downloadLinks);

  await page.close();

  console.log("Going to download link...");

  const downloadLink = await getHubcloudDownloadLink(browser, downloadLinks);

  if (!downloadLink) {
    console.log("Download link not found.");
    return;
  }

  return {
    bannerLink,
    downloadLink,
    screenshots,
    imdbDetails,
  };
}

async function main() {
  await connectToDatabase();

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Browser launched.");

  console.log("Opening new page...");
  const page = await browser.newPage();
  console.log("New page opened.");

  console.log("Navigating to URL...");
  await page.goto("https://1cinevood.cyou/", {
    waitUntil: "networkidle2",
  });
  console.log("Navigation complete.");

  await page.waitForSelector("#content_box");
  const articles = await page.$$("#content_box article");

  const pages = [];

  for (const article of articles) {
    const header = await article.$("header");
    const anchor = await header?.$("a");

    const href = await page.evaluate((a) => a?.href, anchor);

    const img = await article.$("img");
    const src = await page.evaluate((img) => img?.src, img);

    if (href)
      pages.push({
        href,
        bannerLink: src,
      });
  }

  await page.close();

  console.log("got pages: ", pages);

  for (const page of pages) {
    const movieDetails = await handleSinglePostDownload(browser, {
      href: page.href,
      bannerLink: page.bannerLink,
    });

    if (!movieDetails) {
      console.log("Movie details not found.");
      continue;
    }

    await uploadMovieFromCollector(movieDetails);
  }

  console.log("Closing browser...");

  await browser.close();
}

program
  .addOption(
    new Option("-p, --provider <type>")
      .choices(["cinevood", "movies4u"])
      .makeOptionMandatory()
  )
  .requiredOption("-l, --link <type>", "link of provider");

program.parse(process.argv);

const options = program.opts();

console.log("Options: ", options);

async function startProcess() {
  await connectToDatabase();

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Browser launched.");

  const link = options.link;

  if (options.provider === "cinevood") {
  } else if (options.provider === "movies4u") {
    await movies4u.startScrapping(browser, link);
  }

  console.log("closing browser...");
  await browser.close();

  process.exit(0);
}

startProcess();
