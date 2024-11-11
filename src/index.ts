import { sleep } from "bun";
import type { HTTPRequest } from "puppeteer";
import type { Page } from "puppeteer";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";

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

  const server10gbButton = await downloadPage.evaluateHandle(() => {
    const links = Array.from(document.querySelectorAll("a"));
    const button = links.find((link) =>
      link.innerText.includes("Download [Server : 10Gbps]"),
    );
    button?.click();
    return button;
  });

  if (!server10gbButton?.asElement()) {
    throw Error("Server 10gb button not found.");
  }

  console.log("Found 10gb button and clicked.");

  await sleep(5000);

  pages = await browser.pages();
  downloadPage = pages[pages.length - 1];

  await downloadPage.waitForSelector("#downloadbtn");

  await sleep(5000);

  const finalLink = await downloadPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    const button = links.find((link) =>
      link.innerText.includes("Download Here"),
    );
    return button?.href;
  });

  if (!finalLink) {
    throw Error("VD button not found.");
  }

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

async function handleSinglePostDownload(
  browser: Browser,
  url: string,
): Promise<void> {
  console.log("Opening new page...");
  const page = await browser.newPage();
  console.log("New page opened.");

  console.log(`Navigating to URL: ${url}`);
  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  console.log("Navigation complete.");

  await page.waitForSelector(".post-single-content");
  const centerTag = await page.$(".post-single-content center");
  const paragraphs = await centerTag?.$$("p");
  const secondParagraph = paragraphs?.[1];

  if (secondParagraph) {
    const images = await secondParagraph.$$("img");
    const screenshots = await Promise.all(
      images.map((img) => page.evaluate((img) => img.src, img)),
    );
    console.log("Image sources:", screenshots);
  }

  const h6Elements = await centerTag?.$$("h6")!;
  const downloadTitles = await Promise.all(
    h6Elements.map((h6) => page.evaluate((h6) => h6.innerText, h6)),
  );
  console.log("Download link titles:", downloadTitles);

  const downloadableTitleIndex = selectDownloadableLink(downloadTitles);

  if (downloadableTitleIndex === -1) {
    console.log("No download link found.");
  }

  const downloadableTitleElement = h6Elements[downloadableTitleIndex];

  const downloadableText = await page.evaluate(
    (el) => el.innerText,
    downloadableTitleElement,
  );
  console.log("Downloadable link text:", downloadableText);

  const downloadableParagraph = await downloadableTitleElement?.evaluateHandle(
    (el) => el.nextElementSibling,
  );

  const downloadLinksElements = await downloadableParagraph
    ?.asElement()
    ?.$$("a");

  if (!downloadLinksElements) {
    console.log("No download links found.");
    return;
  }

  const downloadLinks = await Promise.all(
    downloadLinksElements.map((a: any) => page.evaluate((a) => a.href, a)),
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
    firstDownloadLink,
  );

  console.log("downloadLink", downloadLink);
}

async function main() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    timeout: 60000 * 2,
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

  const pages: string[] = [];

  for (const article of articles) {
    const header = await article.$("header");
    const anchor = await header?.$("a");

    const href = await page.evaluate((a) => a?.href, anchor);

    const img = await article.$("img");
    const src = await page.evaluate((img) => img?.src, img);

    if (href) pages.push(href);
  }

  await page.close();

  console.log("got pages: ", pages.length);

  for (const page of pages) {
    await handleSinglePostDownload(browser, page);
    break;
  }
  await browser.close();
}

main();
