import { load } from "cheerio";
import { Page } from "puppeteer";

export async function loadContent(
  page: Page,
  link: string,
  selector: string,
  option = { closePageAfterLoad: true, timeout: 100000 }
) {
  console.log("Navigating to URL: ", link);
  await page.goto(link, {
    waitUntil: "networkidle2",
    timeout: option.timeout,
  });

  console.log("Waiting for", selector);
  await page.waitForSelector(selector);

  const content = await page.content();

  if (option.closePageAfterLoad) await page.close();

  return load(content);
}
