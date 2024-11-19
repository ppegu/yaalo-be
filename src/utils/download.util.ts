import cliProgress from "cli-progress";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

export async function downloadFileFromURL(
  url: string,
  fileId: string
): Promise<string> {
  const tmpDir = path.resolve(__dirname, "../../tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const filePath = path.join(tmpDir, fileId);
  console.log(`Starting download...`);

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
  progressBar.start(100, 0);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, (response) => {
        const totalSize = parseInt(
          response.headers["content-length"] || "0",
          10
        );
        let downloadedSize = 0;

        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
          progressBar.update(Number(progress));
        });

        response.pipe(file);
        file.on("finish", () => {
          console.log(`Download completed for ${filePath}`);
          file.close(() => resolve(filePath));
          progressBar.stop();
        });
      })
      .on("error", (err) => {
        console.error(`Error downloading : ${err.message}`);
        fs.unlink(filePath, () => reject(err));
        progressBar.stop();
      });

    file.on("error", (err) => {
      console.error(`Error writing to file ${filePath}: ${err.message}`);
      fs.unlink(filePath, () => reject(err));
      progressBar.stop();
    });
  });
}
