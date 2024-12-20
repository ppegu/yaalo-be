import { CheerioAPI, load } from "cheerio";
import { exec } from "child_process";
import { Page } from "puppeteer";
import Logger from "../utils/Logger";

const logger = Logger.createLogger("content-collector");

export async function loadHTMLContentFromLink(
  link: string,
  option: {
    closePageAfterLoad?: true;
    timeout?: 100000;
    selector?: string;
    page?: Page;
    tool: "wget" | "puppeteer";
  }
): Promise<CheerioAPI> {
  logger.info("loading html content using", option.tool);

  if (option.tool === "puppeteer") {
    const page = option.page!;

    console.log("Navigating to URL: ", link);
    await page?.goto(link, {
      waitUntil: "networkidle2",
      timeout: option.timeout,
    });

    if (option.selector) {
      console.log("Waiting for", option.selector);
      await page.waitForSelector(option.selector);
    }

    const content = await page.content();

    if (option.closePageAfterLoad) await page.close();

    return load(content);
  } else if (option.tool === "wget") {
    const content = await new Promise<string>((resolve, reject) => {
      exec(`wget -O - ${link}`, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
    return load(content);
  } else {
    throw new Error("Tool not supported.");
  }
}
