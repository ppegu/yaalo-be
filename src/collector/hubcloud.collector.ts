import { sleep } from "bun";
import type { Browser } from "puppeteer";

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

  await sleep(5000);
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

export async function getHubcloudDownloadLink(
  browser: Browser,
  downloadLinks: string[]
) {
  const downloadUrl = downloadLinks.filter((link) =>
    link.includes("hubcloud")
  )[0];

  if (!downloadUrl) {
    throw Error("Hubcloud download link not found.");
  }

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
