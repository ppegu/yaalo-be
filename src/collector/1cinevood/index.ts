import * as cheerio from "cheerio";
import { Browser } from "puppeteer";
import { DownloadLinkInfo, ScrappedMovie } from "../../@types/collector";
import { DownloadLink, Movie } from "../../models/MovieModels";
import { loadContent } from "../../utils/cheerio.util";
import { connectToDatabase } from "../../utils/database.util";
import Logger from "../../utils/Logger";
import { getMovieDetailsFromTmdb } from "../../utils/tmdb.util";
import { extractElementsLinks, getDownloadLinkInfo } from "../collector.util";

const logger = Logger.createLogger("cinevood");

export default class CineVood {
  websiteLink: string;
  browser: Browser;

  constructor(websiteLink: string) {
    this.websiteLink = websiteLink;
  }

  async getDownloadLinksFromArticle(
    $: cheerio.CheerioAPI
  ): Promise<DownloadLinkInfo[]> {
    const centerTag = $(".post-single-content center");

    const h6Elements = centerTag.children("h6");

    const downloadableLinks = h6Elements
      .map((_, element) => {
        const downloadLinkElement = $(element).next("p");
        const aTags = downloadLinkElement.find("a");
        const hrefs = aTags.map((_, a) => $(a).attr("href")).get();
        return {
          links: hrefs,
          sentence: $(element).find("span").text(),
        };
      })
      .get();

    const links = getDownloadLinkInfo(downloadableLinks);

    return links;
  }

  async insertMoviesToDatabase(movies: ScrappedMovie[]) {
    await connectToDatabase();

    const insertedLinks = await DownloadLink.insertMany(
      movies.flatMap((movie) => movie.downloadLinks)
    );

    const preparedMovies = movies.map((movie) => {
      return {
        ...movie.movieInfo,
        downloadLinks: insertedLinks.map((link) => link._id),
      };
    });

    const insertedDocs = await Movie.insertMany(preparedMovies);
    logger.info("Movies inserted", insertedDocs.length, "to the database.");
  }

  async getMovieDetails(link: string) {
    try {
      logger.info("Extracting movie details");

      const page = await this.browser.newPage();

      const $ = await loadContent(page, link, ".post-single-content");

      const title = $("#movie_title").text();

      if (!title) {
        logger.error("Title not found for the article.");
        return;
      }

      // get the details from TMDB
      logger.log("Getting movie details from TMDB:", title);
      const movieInfo = await getMovieDetailsFromTmdb(title);

      logger.log("getting download links for:", movieInfo.title);
      const downloadLinks = await this.getDownloadLinksFromArticle($);

      return {
        downloadLinks,
        movieInfo,
      };
    } catch (error) {
      logger.error("Error while getting movie details: ", error);
      return;
    }
  }

  async startScrapping(browser: Browser) {
    this.browser = browser;

    logger.info("Starting scrapping...");

    const page = await browser.newPage();
    /** load all the contents and get the article links */
    const $ = await loadContent(page, this.websiteLink, "#content_box");
    const articles = $("#content_box article").toArray();
    const articleLinks = extractElementsLinks(articles, "a");

    // const articleLinks = [
    //   "https://1cinevood.digital/the-lord-of-the-rings-the-war-of-the-rohirrim-2024-hdts-english-1080p-avc-aac-2-0/",
    //   "https://1cinevood.digital/kraven-the-hunter-2024-hdrip-1080p-hindi-english-x264-aac-hc-sub/",
    //   "https://1cinevood.digital/zero-se-restart-2024-hindi-hdtc-1080p-x264-aac/",
    //   "https://1cinevood.digital/pushpa-2-the-rule-2024-hdtc-1080p-hindi-multi-x264-aac-hc-esub-full-movie/",
    // ];

    logger.log("Found article links: ", articleLinks.length);

    const movies: ScrappedMovie[] = [];

    for (const articleLink of articleLinks) {
      const movie = await this.getMovieDetails(articleLink);
      if (movie) {
        movies.push(movie);
      }
      break;
    }

    logger.info("Extracted", movies.length, "from the articles.");

    await this.insertMoviesToDatabase(movies);
  }
}
