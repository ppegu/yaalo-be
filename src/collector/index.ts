import dotenv from "dotenv";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";
import { connectToDatabase } from "../utils/database.util";
import { getMovieDetailsFromTmdb } from "../utils/tmdb.util";
import { getHubcloudDownloadLink } from "./hubcloud.collector";
import { uploadMovieFromCollector } from "./upload.collector";

dotenv.config();

const MAX_DOWNLOAD_SIZE = 800;
const MIN_DOWNLOAD_SIZE = 300;
const MAX_UNIT = "MB";
const MIN_UNIT = "MB";

function selectDownloadableLink(sentences: string[]): number {
  const fileSizeRegex = /(\d+(?:\.\d+)?)(\s?(GB|MB))/i;

  const cleanedSentences = sentences.map((sentence) =>
    sentence.replace(/\s+/g, " ")
  );

  for (let i = 0; i < cleanedSentences.length; i++) {
    const match = cleanedSentences[i].match(fileSizeRegex);

    if (match) {
      const size = parseFloat(match[1]);
      const unit = match[3].toUpperCase();

      if (
        unit === MAX_UNIT &&
        size <= MAX_DOWNLOAD_SIZE &&
        unit === MIN_UNIT &&
        size >= MIN_DOWNLOAD_SIZE
      ) {
        console.log("unti:", unit, "size:", size);
        return i;
      }
    }
  }

  return -1;
}

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

main();
