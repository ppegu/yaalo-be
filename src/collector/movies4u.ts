import { Browser, Page } from "puppeteer";
import * as cheerio from "cheerio";
import {
  extractElementsLinks,
  getDownloadableClearTexts,
  selectDownloadableLink,
} from "./collector.util";
import { getMovieDetailsFromTmdb } from "../utils/tmdb.util";

async function getArticles(page: Page) {
  console.log("Getting articles...");
  const articles = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll("#main article"));
    return articles.map((article) => article.outerHTML);
  });

  console.log("Articles found: ", articles.length);

  await page.close();

  return articles;
}

async function getDownloadLinksFromArticle(
  browser: Browser,
  articleLink: string
) {
  console.log("Opening new page...");
  const page = await browser.newPage();
  console.log("New page opened.");

  console.log("Navigating to URL: ", articleLink);
  await page.goto(articleLink, {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("main");

  const articleContent = await page.evaluate(() => {
    return document.querySelector("main article")?.outerHTML;
  });

  await page.close();

  if (!articleContent) {
    throw new Error("Article content not found.");
  }

  const $ = cheerio.load(articleContent);

  let downloadElements = $(".entry-content .code-block h5");

  let downloadTexts = getDownloadableClearTexts(
    downloadElements.map((i, el) => $(el).text()).get()
  );

  console.log("downloadTexts", downloadTexts);

  let downloadElementIndex = selectDownloadableLink(downloadTexts, {
    maxUnit: "GB",
    maxSize: 2,
    minUnit: "MB",
    minSize: 800,
  });

  console.log("Download Element Index: ", downloadElementIndex);

  if (!downloadTexts.length) {
    downloadElements = $(".entry-content .code-block p strong");
    downloadTexts = getDownloadableClearTexts(
      downloadElements.map((i, el) => $(el).text()).get()
    );
  }

  console.log("downloadTexts", downloadTexts);

  if (downloadElementIndex === -1) {
    throw new Error("Download link not found.");
  }

  const movieNameElement = $("p:contains('Movie Name:')");
  let movieName = movieNameElement.text().replace("Movie Name:", "").trim();

  if (!movieName) {
    const match =
      downloadTexts[downloadElementIndex]?.match(/^(.*?)\s*\(\d{4}\)/);
    if (match) {
      movieName = match[1].trim();
    } else {
      throw new Error("Movie name coul``d not be determined.");
    }
  }

  console.log("Movie Name: ", movieName);

  const movieInfo = await getMovieDetailsFromTmdb(movieName);

  console.log("movieInfo", movieInfo);
}

async function startScrapping(browser: Browser, websiteLink: string) {
  console.log("Opening new page...");
  const page = await browser.newPage();
  console.log("New page opened.");

  console.log("Navigating to URL: ", websiteLink);
  await page.goto(websiteLink, {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#main");

  const content = await page.content();
  const $ = cheerio.load(content);

  const aricles = $("#main article").toArray();

  const articleLinks = extractElementsLinks(aricles, "h2 a");

  console.log("Article links: ", articleLinks.length);

  for (const articleLink of articleLinks) {
    await getDownloadLinksFromArticle(browser, articleLink);
    // break;
  }
}

export default { startScrapping };
