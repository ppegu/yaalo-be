import * as cheerio from "cheerio";
import { Browser } from "puppeteer";
import { DownloadLinkInfo, ScrappedMovie } from "../../@types/collector";
import { DownloadLink, Movie } from "../../models/MovieModels";
import { connectToDatabase } from "../../utils/database.util";
import Logger from "../../utils/Logger";
import { getMovieDetailsFromTmdb } from "../../utils/tmdb.util";
import { extractElementsLinks, getDownloadLinkInfo } from "../collector.util";
import { loadHTMLContentFromLink } from "../content.collector";
import get1CineVoodMovieInfo from "./get1CineVoodMovieInfo";

const logger = Logger.createLogger("cinevood");

export default class CineVood {
  websiteLink: string;
  browser?: Browser;
  tool: "wget" | "puppeteer";

  constructor(websiteLink: string, tool: "wget" | "puppeteer") {
    this.websiteLink = websiteLink;
    this.tool = tool;
  }

  async getDownloadLinksFromArticle(
    $: cheerio.CheerioAPI,
    isTv?: boolean
  ): Promise<DownloadLinkInfo[]> {
    const centerTag = $(".post-single-content center");

    const h6Elements = centerTag.children("h6");

    const downloadableLinks = h6Elements
      .map((_, element) => {
        const downloadLinkElement = $(element).next("p");
        const aTags = downloadLinkElement.find("a");
        const hrefs = aTags.map((_, a) => $(a).attr("href")).get();

        if (hrefs.length) {
          return {
            links: hrefs,
            sentence: $(element).find("span").text().trim(),
          };
        }

        if (isTv) {
          const tvATags = $(element).next("a");
          const tvHrefs = tvATags.map((_, a) => $(a).attr("href")).get();
          if (tvHrefs.length) {
            return {
              links: tvHrefs,
              sentence: $(element).find("span").text().trim(),
            };
          }
        }
        return null;
      })
      .get()
      .filter((link) => link !== null);

    const links = getDownloadLinkInfo(downloadableLinks);

    return links;
  }

  async insertMoviesToDatabase(movies: ScrappedMovie[]) {
    await connectToDatabase();

    const preparedMovies = movies.map((movie) => {
      const movieDoc = new Movie({
        ...movie.movieInfo,
      });
      return {
        movieDoc,
        downloadLinks: movie.downloadLinks.map(
          (downloadLink) =>
            new DownloadLink({
              movieId: movieDoc._id,
              ...downloadLink,
            })
        ),
      };
    });

    const [downloadLinksResult, insertedDocs] = await Promise.all([
      DownloadLink.insertMany(preparedMovies.flatMap((m) => m.downloadLinks)),
      Movie.insertMany(preparedMovies.map((m) => m.movieDoc)),
    ]);

    logger.info(
      "Download links inserted",
      downloadLinksResult.length,
      "to the database."
    );
    logger.info("Movies inserted", insertedDocs.length, "to the database.");
  }

  async getMovieDetails(link: string) {
    try {
      logger.info("Extracting movie details");

      const $ = await this.loadContent(link, ".post-single-content");

      const movieInfo = await get1CineVoodMovieInfo($);

      logger.log("getting download links for:", movieInfo.title);
      const downloadLinks = await this.getDownloadLinksFromArticle(
        $,
        movieInfo.isTv
      );

      return {
        downloadLinks,
        movieInfo,
      };
    } catch (error) {
      logger.error("Error while getting movie details: ", error);
      return;
    }
  }

  async loadContent(link: string, selector: string, options = {}) {
    logger.info("Loading content from link:", link);
    const finalOptions = {
      tool: this.tool,
      ...options,
    };
    return loadHTMLContentFromLink(link, {
      ...(finalOptions.tool === "puppeteer" && {
        page: await this.browser?.newPage(),
        closePageAfterLoad: true,
        timeout: 100000,
      }),
      selector,
      ...finalOptions,
    });
  }

  async startScrapping(browser?: Browser) {
    if (this.tool === "puppeteer") {
      if (!browser) {
        throw new Error("Browser is not provided.");
      }
      this.browser = browser;
    }

    logger.info("Starting scrapping...");

    /** load all the contents and get the article links */
    const $ = await this.loadContent(this.websiteLink, "#content_box");

    const contentbox = $("#content_box");

    // second last element tells the total page numbers
    const totalPageText = contentbox
      .find("nav")
      .find(".page-numbers")
      .last()
      .prev()
      .text();

    const totalPages = 1 || Number(totalPageText);

    logger.info("Found Total pages: ", totalPages);

    if (isNaN(totalPages)) {
      throw new Error("Total pages not found");
    }

    for (let i = 1; i <= totalPages; i++) {
      let articles;

      if (i > 1) {
        const pageLink = `${this.websiteLink}/page/${i}/`;
        const $ = await this.loadContent(pageLink, "#content_box");
        articles = $("#content_box").find("article").toArray();
      } else {
        articles = contentbox.find("article").toArray();
      }

      logger.info("extracting article links from page:", i);
      const articleLinks = extractElementsLinks(articles, "a");

      logger.log("Found article links: ", articleLinks.length);

      await this.getMovieDetails(articleLinks[2]);

      // const movies: ScrappedMovie[] = [];

      // for (const articleLink of articleLinks) {
      //   const movie = await this.getMovieDetails(articleLink);
      //   if (movie) {
      //     movies.push(movie);
      //   }
      //   break;
      // }

      // logger.info("Extracted", movies.length, "from the articles.");

      // await this.insertMoviesToDatabase(movies);
    }
  }
}

async function _test() {
  const cineVood = new CineVood("https://1cinevood.digital/", "wget");

  await cineVood.startScrapping();
}

// _test();
