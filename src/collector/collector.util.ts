import * as cheerio from "cheerio";

export function extractElementsLinks(
  elements: string[],
  selector: string,
  attr: string = "href"
) {
  return elements
      .map((element) => {
        const $ = cheerio.load(element);
        return $(selector).attr(attr);
      })
      .filter((link) => link !== null)
      .filter((link) => link !== undefined);
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

export function selectDownloadableLink(
  sentences: string[],
  options: Options | undefined = {
    maxSize: MAX_DOWNLOAD_SIZE,
    maxUnit: MAX_UNIT,
    minSize: MIN_DOWNLOAD_SIZE,
    minUnit: MIN_UNIT,
  }
): number {
  const fileSizeRegex = /(\d+(?:\.\d+)?)(\s?(GB|MB))/i;

  const cleanedSentences = sentences.map((sentence) =>
    sentence.replace(/\s+/g, " ")
  );

  for (let i = 0; i < cleanedSentences.length; i++) {
    const match = cleanedSentences[i].match(fileSizeRegex);

    if (match) {
      const size = parseFloat(match[1]);
      const unit = match[3].toUpperCase();

      // check for min size
      if (unit === options.minUnit && size >= options.minSize) {
        return i;
      }

      // check for max size
      if (unit === options.maxUnit && size <= options.maxSize) {
        return i;
      }

      //   if (
      //     unit === options.maxUnit &&
      //     size <= options.maxSize &&
      //     unit === options.minUnit &&
      //     size >= options.minSize
      //   ) {
      //     return i;
      //   }
    }
  }

  return -1;
}
