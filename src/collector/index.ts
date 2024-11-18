import axios from "axios";
import { sleep } from "bun";
import dotenv from "dotenv";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";
import { connectToDatabase } from "../utils/database.util";
import { uploadMovieFromCollector } from "./upload.collector";

dotenv.config();

function selectDownloadableLink(sentences: string[]): number {
  const fileSizeRegex = /(\d+(?:\.\d+)?)(\s?(GB|MB))/i;

  for (let i = 0; i < sentences.length; i++) {
    const match = sentences[i].match(fileSizeRegex);
    if (match) {
      const size = parseFloat(match[1]);
      const unit = match[3].toUpperCase();

      if ((unit === "GB" && size <= 2) || (unit === "MB" && size >= 800)) {
        return i;
      }
    }
  }

  return -1;
}

async function getHubcloud10GbDownloadLink(browser: Browser) {
  let pages = await browser.pages();
  let downloadPage = pages[pages.length - 1];

  const server10gbLink = await downloadPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    const a = links.find((link) =>
      link.innerText.includes("Download [Server : 10Gbps]")
    );

    return a?.href;
  });

  if (!server10gbLink) {
    throw Error("Server 10gb link not found.");
  }

  console.log("Found 10gb link");

  await downloadPage.close();

  downloadPage = await browser.newPage();

  await downloadPage.goto(server10gbLink, {
    waitUntil: "networkidle2",
  });

  await downloadPage.waitForSelector("#downloadbtn");

  await sleep(5000);

  const finalLink = await downloadPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    const button = links.find((link) =>
      link.innerText.includes("Download Here")
    );
    return button?.href;
  });

  if (!finalLink) {
    throw Error("VD button not found.");
  }

  await downloadPage.close();

  return finalLink;
}

async function getHubcloudDownloadLink(browser: Browser, downloadUrl: string) {
  const page = await browser.newPage();
  await page.goto(downloadUrl, {
    waitUntil: "networkidle2",
  });

  let pages = await browser.pages();

  if (pages.length !== 2)
    throw Error("Pages length is not 2. Something went wrong.");

  let downloadPage = pages[pages.length - 1];

  console.log("Download page url", downloadPage.url());

  await downloadPage.waitForSelector("#download");

  const downloadButton = await downloadPage.$("#download");

  if (!downloadButton) {
    console.log("Download button not found.");
    return;
  }

  console.log("Download button found, initiating download...");

  await downloadButton.evaluate(() => {
    const downloadButton = document.getElementById("download");
    downloadButton?.click();
  });

  // redirect expected
  await downloadPage.waitForNavigation({ waitUntil: "networkidle2" });

  const downloadLink = await getHubcloud10GbDownloadLink(browser);

  return downloadLink;
}

async function getMovieDetailsFromTmdb(movieTitle: string) {
  const apiKey = process.env.TMDB_API_KEY;

  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    movieTitle
  )}`;
  const searchResponse = await axios.get(searchUrl);
  const searchData = searchResponse.data;

  if (searchData.results.length === 0) {
    console.error("Movie not found on TMDB.");
    return;
  }

  const movieId = searchData.results[0].id;
  const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`;
  const detailsResponse = await axios.get(detailsUrl);
  const movieDetails = detailsResponse.data;

  return {
    title: movieDetails?.original_title,
    description: movieDetails?.overview,
    releaseDate: movieDetails?.release_date,
  };
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
  link: { href: string; bannerLink: string }
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

  const firstDownloadLink = downloadLinks[0];

  await page.close();

  if (!firstDownloadLink) {
    console.log("No download link found.");
    return;
  }

  console.log("Going to download link...");

  const downloadLink = await getHubcloudDownloadLink(
    browser,
    firstDownloadLink
  );

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
    timeout: 60000 * 2,
  });
  console.log("Browser launched.");

  const link = {
    href: "https://1cinevood.cyou/apne-ghar-begane-2024-punjabi-predvd-1080p-x264-aac/",
    bannerLink:
      "https://imgshare.xyz/img/1/673736c2550a331767be76b1/photo_2024-11-15_03-53-58.jpg",
  };

  // const movieDetails = await handleSinglePostDownload(browser, link);

  const movieDetails = {
    bannerLink:
      "https://imgshare.xyz/img/1/673736c2550a331767be76b1/photo_2024-11-15_03-53-58.jpg",
    downloadLink:
      "https://video-downloads.googleusercontent.com/ADGPM2n67QDNJHidPIgFKJaisTUXVjxI4esPtYF70YNgsN3aUaWPOG-9AHhVED9snewMy0T4NpROlKWNNPUBi1P09sTfps5vHUcoBnFxHnsO_H6alWhwipKp2MlowccU261UxQa5xEJX1d2NJd1vueJvRHhDeEGbgMy-YY0ZjyuWz3nFFHJQlWMrjtw1cHqGDZv-elDVRHn7sBTjE0b2BaDjz-aEWaFNlBAG44fw9JgcdPQWr2AaqDAo-7S2-mxP7TalDRWXIvJo50Pzy5IM_XiTphsKqo81RfPWmlzT-iv_GpgTKyLFb-6bKP6MnBfMwku3HMy1L0B4t-Q2bxA_C91YX3bko7I-R0UlsqQNkcawbGZbzmiFR7sioB69O-9v1Z4tokbwAN0_CLhQ6ZRwvqsOtxu4VMfWBzWNC7nVsJ0YEc8Sq8jFiMIzU9yQodn-wM2tBy5I6S7FWomBA28CSRvLUuDgC-gL3QsC6e9qxHXGHR_V_1u2bxizEMtDJsordoXKIqJ2bdJ-6819rXamIcGbswVt0edGh5mB-vKnUY5wX-y94sdakZ7W3lC2dalrLijaGWp2xza9P2isGu6DcDOI3U59WNvw-raPr5YjsuTzLDUGQXxUg6iR99wpGkSNvyy8ddd2KQD_HA7jVq3yiXjnIfQLHnTZhm7UwB4Ijs-KPs_JUjKHM7ADZYWnYlJsIlhnhFVIs3vphCvOl6INIlTxQSspjM0tBIbrGy_fKq1Em9sJcTw2kkbZ0xrHD-HDAvAEVQiArHvLoZa390rgnM5Xy3wjKHRtg1hvwQMlns1BBWmXpwRpe2iTLMxAre5o_JO0tCQheLMrmN2SgTCuL_gPEb7VYI2w5aKZFLHvtRB1jiKl-EljcgCHWDGnyvNBPpZAiVxIZhjlvp637yOwVH5DaTDnO0Sm9D4CZDbXpdWblsVeIopDzOPly4gmHn7p9qY9X6fiHUojOS9wAA-KRblXCRrBxZ_qzf0PnWDvpK9Us_DQQnHBRk1CpfJ1l5T2zEY2ejbvNcHgWJTrCNz9jUy4tcmao2CoxRS_T_Rk5KpB4QsZ2zRkyyCos1KWQcPYLG-GIWlLiIJT",
    screenshots: [
      "https://imgshare.xyz/img/3/67377dfe550a331767be76cb/Snapshot_1.jpg",
      "https://imgshare.xyz/img/5/67377dfc550a331767be76c8/Snapshot_2.jpg",
      "https://imgshare.xyz/img/2/67377dfd550a331767be76ca/Snapshot_5.jpg",
      "https://imgshare.xyz/img/1/67377dfe550a331767be76cc/Snapshot_6.jpg",
      "https://imgshare.xyz/img/4/67377dfd550a331767be76c9/Snapshot_7.jpg",
    ],
    imdbDetails: {
      title: "Apne Ghar Begane",
      description:
        "Gurdev Singh, living in Canada with his son’s family, leaves for Punjab after a misunderstanding with his daughter-in-law Monica. The family reconciles at a Gurdwara, reuniting emotionally and restoring peace.",
      releaseDate: "2024-11-15",
    },
  };

  // console.log("Movie details:", movieDetails);

  await browser.close();

  await uploadMovieFromCollector(movieDetails!);

  return;

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

  // for (const page of pages) {
  //   await handleSinglePostDownload(browser, page);
  //   break;
  // }
  await browser.close();
}

main();
