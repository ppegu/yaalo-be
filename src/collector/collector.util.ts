import * as cheerio from "cheerio";
import { Element } from "domhandler";
import { DownloadLinkInfo } from "../@types/collector";
import { convertFileSize } from "../utils/file.util";

export function extractElementsLinks(
  elements: Element[],
  selector: string,
  attr: string = "href"
) {
  const links = [];

  for (const element of elements) {
    const $ = cheerio.load(element);
    const link = $(selector).attr(attr);
    if (link) {
      links.push(link);
    }
  }

  return links;
}

export function extractTextsFromElements(
  elements: Element[],
  selector: string
) {
  const texts = [];
  for (const element of elements) {
    const $ = cheerio.load(element);
    const text = $(selector).text();
    if (text) {
      texts.push(text);
    }
  }

  return texts;
}

interface Options {
  maxUnit: string;
  maxSize: number;
  minUnit: string;
  minSize: number;
}

const MAX_DOWNLOAD_SIZE = 800;
const MIN_DOWNLOAD_SIZE = 300;
const MAX_UNIT = "MB";
const MIN_UNIT = "MB";

export function getDownloadableClearTexts(texts: string[]): string[] {
  return texts.map((text) => text.replace(/\s+/g, " "));
}

export function getDownloadSizeAndUnit(sentence: string) {
  const fileSizeRegex = /(\d+(?:\.\d+)?)(\s?(GB|MB))/i;

  const match = sentence.match(fileSizeRegex);

  const size = parseFloat(match?.[1] || "0");
  const unit: any = match?.[3].toUpperCase() || "MB";

  return {
    size,
    unit,
    sizeInMB: convertFileSize(size, unit, "MB"),
  };
}

export function selectDownloadableLink(
  sentences: string[],
  options: Options | undefined = {
    maxSize: MAX_DOWNLOAD_SIZE,
    maxUnit: MAX_UNIT,
    minSize: MIN_DOWNLOAD_SIZE,
    minUnit: MIN_UNIT,
  }
): number {
  /**
   * A regular expression to match file size strings.
   *
   * This regex captures file sizes in gigabytes (GB) or megabytes (MB).
   * It matches a number (which can be an integer or a decimal) followed by an optional space and the unit (GB or MB).
   *
   * The regex has three capturing groups:
   * 1. The numeric part of the file size, which can be an integer or a decimal.
   * 2. An optional space between the numeric part and the unit.
   * 3. The unit of the file size, which can be either 'GB' or 'MB'.
   *
   * Example matches:
   * - "10GB"
   * - "10 GB"
   * - "10.5GB"
   * - "10.5 GB"
   * - "500MB"
   * - "500 MB"
   */
  const fileSizeRegex = /(\d+(?:\.\d+)?)(\s?(GB|MB))/i;

  const cleanedSentences = sentences.map((sentence) =>
    sentence.replace(/\s+/g, " ")
  );

  let downloadableIndex = -1;
  let downloadableSize = 0;

  for (let i = 0; i < cleanedSentences.length; i++) {
    const match = cleanedSentences[i].match(fileSizeRegex);

    if (!match) continue;

    const size = parseFloat(match[1]);
    const unit: any = match[3].toUpperCase();

    const sizeInMB = convertFileSize(size, unit, "MB");

    // check for max size
    if (unit === options.maxUnit && size <= options.maxSize) {
      if (downloadableSize < sizeInMB) {
        downloadableIndex = i;
        downloadableSize = sizeInMB;
      }
    }

    // check for min size
    else if (unit === options.minUnit && size >= options.minSize) {
      if (downloadableSize < sizeInMB) {
        downloadableIndex = i;
        downloadableSize = sizeInMB;
      }
    }
  }

  return downloadableIndex;
}

export function getDownloadLinkInfo(links: any[]): DownloadLinkInfo[] {
  const supportedQualities = ["1080p", "720p", "480p"];

  return links
    .map(({ sentence, ...rest }) => {
      const fileInfo = getDownloadSizeAndUnit(sentence);
      const quality = supportedQualities.find((q) => sentence.includes(q));
      return {
        quality,
        sentence,
        ...rest,
        ...fileInfo,
      };
    })
    .filter((quality) => quality.quality && quality.size > 0);
}
