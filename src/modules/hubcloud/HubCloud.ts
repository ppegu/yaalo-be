import puppeteer, { Browser } from "puppeteer";
import { loadHTMLContentFromLink } from "../../collector/content.collector";
import Logger from "../../utils/Logger";

const logger = Logger.createLogger("HubCloud");

export default class HubCloud {
  link: string;
  browser: Browser;

  constructor(link: string) {
    this.link = link;
  }

  async generateDownloadPageLink() {
    logger.info("Generating download page link from:", this.link);
    const $ = await loadHTMLContentFromLink(this.link, {
      tool: "wget",
    });

    const scriptContent = $(".tab-content ").find("script").text();

    //eg:  var url = 'https://shetkaritoday.in/hubcloud.php?host=hubcloud&id=q77xtf11ypdhdfo&token=TlUrUHFMR0lId0c2T0pXemN2SmNtMTIzVTB5b1J6R25xbmp2c1F4RVo5cz0=';
    const urlMatch = scriptContent.match(/var url = 'http.*?';/);
    if (!urlMatch?.length) {
      throw new Error("Script download link not found.");
    }

    const downloadPageLink = urlMatch[0].split("'")?.[1];
    if (!downloadPageLink) {
      throw new Error(`Download link not found in ${urlMatch[0]}`);
    }

    return downloadPageLink;
  }

  async generateFinalDownloadPageLink(pageLink: string) {
    logger.info("Generating final download link from:", pageLink);

    const $ = await loadHTMLContentFromLink(pageLink, {
      tool: "puppeteer",
      page: await this.browser.newPage(),
      selector: "#section2",
      timeout: 60000,
    });

    const downloadLink = $("a:contains('Download [Server : 10Gbps]')")?.attr(
      "href"
    );

    if (!downloadLink) {
      throw new Error("Download link not found.");
    }

    return downloadLink;
  }

  async generateDownloadFileLink(pagelink: string) {
    const $ = await loadHTMLContentFromLink(pagelink, {
      tool: "wget",
    });

    const downloadLink = $("a:contains('Download Here')").attr("href");

    return downloadLink;
  }

  async generateDownloadLink() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const downloadPageLink = await this.generateDownloadPageLink();

    const finalPageLink = await this.generateFinalDownloadPageLink(
      downloadPageLink
    );

    const fileDownloadLink = await this.generateDownloadFileLink(finalPageLink);

    return fileDownloadLink;
  }
}
