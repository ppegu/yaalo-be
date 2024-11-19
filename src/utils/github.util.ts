import { Buffer } from "buffer";
import cliProgress from "cli-progress";
import * as dotenv from "dotenv";
import type { Request, Response } from "express";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import Logger from "./Logger";
import { Stream } from "stream";
import axios from "axios";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

const logger = Logger.createLogger("github.util");

export async function createGithubRepo(repoName: string, description: string) {
  try {
    const octokit = new (await import("@octokit/rest")).Octokit({
      auth: GITHUB_TOKEN,
    });

    const [owner, repo] = repoName.split("/");

    logger.info(`Checking if repository ${repoName} exists`);
    const { data: existingRepo } = await octokit.repos
      .get({
        owner,
        repo,
      })
      .catch(() => ({ data: null }));

    if (existingRepo) {
      logger.info(`Repository ${repoName} already exists`);
      return existingRepo;
    }

    logger.info(`Creating repository ${repoName}`);
    const response = await octokit.repos.createForAuthenticatedUser({
      name: repo,
      description: description,
      private: false,
    });

    logger.info(`Repository ${repoName} created successfully`);
    return response.data;
  } catch (error: any) {
    logger.error(`Error creating repository ${repoName}: ${error.message}`);
    throw error;
  }
}

export async function deleteGithubRepo(repoName: string) {
  try {
    const octokit = new (await import("@octokit/rest")).Octokit({
      auth: GITHUB_TOKEN,
    });

    const [owner, repo] = repoName.split("/");

    logger.info(`Deleting repository ${repoName}`);
    await octokit.repos.delete({
      owner,
      repo,
    });

    logger.info(`Repository ${repoName} deleted successfully`);
  } catch (error: any) {
    logger.error(`Error deleting repository ${repoName}: ${error.message}`);
    throw error;
  }
}

export async function uploadFileToGithub(repoName: string, fileUrl: string) {
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);

  try {
    const octokit = new (await import("@octokit/rest")).Octokit({
      auth: GITHUB_TOKEN,
    });

    logger.info(`Starting upload of file ${fileUrl} to repository ${repoName}`);
    await createGithubRepo(repoName, "Uploaded files");

    const [owner, repo] = repoName.split("/");

    const fileStream = fs.createReadStream(fileUrl, {
      highWaterMark: CHUNK_SIZE,
    });
    const fileSize = fs.statSync(fileUrl).size;
    let uploadedSize = 0;
    let chunkIndex = 0;
    const chunkIds: { id: string; size: number }[] = [];

    progressBar.start(100, 0);

    for await (const chunk of fileStream) {
      const chunkId = uuidv4();

      const contentEncoded = chunk.toString("base64");

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `chunks/${chunkId}`,
        message: `Upload chunk ${chunkIndex}`,
        content: contentEncoded,
      });

      chunkIds.push({ id: chunkId, size: uploadedSize });

      uploadedSize += chunk.length;
      const progress = ((uploadedSize / fileSize) * 100).toFixed(2);

      progressBar.update(Number(progress));
      chunkIndex++;
    }
    progressBar.stop();

    const chunkIdsJson = JSON.stringify(chunkIds);

    logger.info(`\nUploading chunk IDs to repository ${repoName}`);
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "chunkIds.json",
      message: "Upload chunk IDs",
      content: Buffer.from(chunkIdsJson).toString("base64"),
    });

    const metadata = {
      chunks: chunkIds.length,
      size: fileSize,
    };

    logger.info(`Uploading metadata to repository ${repoName}`);
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "metadata.json",
      message: "Upload metadata",
      content: Buffer.from(JSON.stringify(metadata)).toString("base64"),
    });

    logger.info(
      `File ${fileUrl} uploaded successfully to repository ${repoName}`
    );
  } catch (error: any) {
    progressBar.stop();

    logger.error(
      `Error uploading file ${fileUrl} to repository ${repoName}: ${error.message}`
    );

    try {
      await deleteGithubRepo(repoName);
    } catch (deleteError: any) {
      logger.error(
        `Error deleting repository ${repoName} after failed upload: ${deleteError.message}`
      );
    }

    throw error;
  }
}
export async function streamFileFromGithub(
  repoName: string,
  req: Request,
  res: Response
) {
  try {
    const octokit = new (await import("@octokit/rest")).Octokit({
      auth: GITHUB_TOKEN,
    });

    const [owner, repo] = repoName.split("/");

    logger.info(`Fetching chunk IDs from repository ${repoName}`);

    const [{ data: chunkIdsFile }, { data: metadataFile }]: any =
      await Promise.all([
        octokit.repos.getContent({
          owner,
          repo,
          path: "chunkIds.json",
        }),
        octokit.repos.getContent({
          owner,
          repo,
          path: "metadata.json",
        }),
      ]);

    const metadata = JSON.parse(
      Buffer.from(metadataFile.content, "base64").toString()
    );

    const range = req.headers.range || "bytes=0-";

    let [start, end] = range
      .replace(/bytes=/, "")
      .split("-")
      .map((x) => parseInt(x, 10));

    if (isNaN(end) || end === undefined) {
      end = metadata.size - 1;
    }

    const contentLength = end - start + 1;

    console.log("start", start, "end", end, "contentLength", contentLength);

    res.status(206);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", contentLength);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${contentLength}`);

    const chunkIds: { id: string; size: number }[] = JSON.parse(
      Buffer.from(chunkIdsFile.content, "base64").toString()
    );

    const readable = new Stream.Readable({
      read() {},
    });

    let disconnected = false;
    req.on("close", () => {
      disconnected = true;
      console.log("disconnected");
    });

    (async () => {
      for (const { id: chunkId, size: chunkSize } of chunkIds) {
        if (!disconnected) {
          const chunkEnd = chunkSize - 1;

          if (start > chunkEnd) {
            console.log(
              "skipping chunk",
              chunkId,
              "start",
              start,
              "chunkEnd",
              chunkEnd
            );
            continue;
          }

          const download_url = `https://raw.githubusercontent.com/${repoName}/main/chunks/${chunkId}`;

          const resp = await axios.get(download_url, {
            responseType: "stream",
          });

          resp.data.on("data", (chunk: Buffer) => {
            readable.push(chunk);
          });

          await new Promise((resolve) => {
            resp.data.on("end", resolve);
          });
        } else {
          logger.info(`Stream disconnected from client, stopping download`);
          break;
        }
      }
      readable.push(null);
    })();

    readable.pipe(res);
  } catch (error: any) {
    logger.error(
      `Error streaming file from repository ${repoName}: ${error.message}`
    );
    throw error;
  }
}
