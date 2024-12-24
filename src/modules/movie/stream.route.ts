import { Router } from "express";
import fs from "fs";
import path from "path";
import { DownloadLink, StreamableLink } from "../../models/MovieModels";
import { downloadFileFromURL } from "../../utils/download.util";
import Logger from "../../utils/Logger";
import { AppResponse, NotFoundError } from "../../utils/response.util";
import { streamVideo } from "../../utils/stream.util";
import HubCloud from "../hubcloud/HubCloud";

const logger = Logger.createLogger("movie.stream.route");

const router = Router();

router.get("/:downloadLinkId/prepare", async (req, res, next) => {
  try {
    const { downloadLinkId } = req.params;

    const downloadLink = await DownloadLink.findById(downloadLinkId).lean();

    if (!downloadLink) {
      throw new NotFoundError("Movie streamable link not found");
    }

    const movieId = downloadLink.movieId;

    let streamableLink = await StreamableLink.findOne({
      movieId,
      downloadLinkId,
    });

    /** check if there's already streaming cache available locally. for the selected downloadLinkId */
    let streamingLink = streamableLink?.link;

    const streamExists = streamingLink ? fs.existsSync(streamingLink) : false;

    let fileSize = streamExists ? fs.statSync(streamingLink!).size : 0;

    /** if there is no local streaming available then initiate download. */
    if (!streamExists || fileSize === 0) {
      const hubcloudLink = downloadLink.links.filter((l) =>
        l.includes("hubcloud")
      )[0];

      if (!hubcloudLink) {
        throw new NotFoundError("Hubcloud Stream link not found");
      }

      const hubcloud = new HubCloud(hubcloudLink);

      const downloadFileLink = await hubcloud.generateDownloadLink();

      logger.info("Download link", downloadFileLink);

      if (!downloadFileLink) {
        throw new NotFoundError("Stream link not found");
      }

      const downloadDir = path.join(__dirname, `../../../tmp/${movieId}`);
      const fileName = downloadLink._id.toString();

      const streamingInfo = await downloadFileFromURL(
        downloadFileLink,
        downloadDir,
        fileName
      );

      console.log("streamingInfo", streamingInfo);

      streamingLink = streamingInfo.filePath;
      fileSize = streamingInfo.totalSize;
    }

    /** save/update the current streaming link for later use */
    streamableLink = await StreamableLink.findOneAndUpdate(
      { movieId, downloadLinkId },
      {
        link: streamingLink,
        lastStreamedAt: new Date(),
        fileSize,
      },
      { upsert: true, new: true }
    );

    if (!streamableLink) {
      throw new Error("Failed to prepare movie for streaming.");
    }

    next(
      new AppResponse(202, "Movie Prepared for streaming.", streamableLink._id)
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:streamableLinkId/stream", async (req, res, next) => {
  try {
    const { streamableLinkId } = req.params;

    const streamableLink = await StreamableLink.findById(
      streamableLinkId
    ).lean();

    if (!streamableLink) {
      throw new NotFoundError("Movie streamable link not found");
    }

    const { link } = streamableLink;

    if (!link) {
      throw new NotFoundError("Stream link not found");
    }

    await streamVideo({ filePath: link }, req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
