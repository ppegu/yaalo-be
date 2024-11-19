import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import Logger from "./Logger";
import cliProgress from "cli-progress";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const logger = Logger.createLogger("github.util");

export async function createGithubRepo(repoName: string, description: string) {
  try {
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
    logger.info(`Starting upload of file ${fileUrl} to repository ${repoName}`);
    await createGithubRepo(repoName, "Uploaded files");

    const [owner, repo] = repoName.split("/");

    const fileStream = fs.createReadStream(fileUrl, {
      highWaterMark: CHUNK_SIZE,
    });
    const fileSize = fs.statSync(fileUrl).size;
    let uploadedSize = 0;
    let chunkIndex = 0;
    const chunkIds = [];

    progressBar.start(100, 0);

    for await (const chunk of fileStream) {
      const chunkId = uuidv4();
      chunkIds.push(chunkId);

      const contentEncoded = chunk.toString("base64");

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `chunks/${chunkId}`,
        message: `Upload chunk ${chunkIndex}`,
        content: contentEncoded,
      });

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
