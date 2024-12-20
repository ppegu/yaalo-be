import cliProgress from "cli-progress";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

export async function downloadFileFromURL(
  url: string,
  downloadDir: string,
  fileName: string
): Promise<{ totalSize: number; filePath: string }> {
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  console.log(`Starting download...`);

  const filePath = path.join(downloadDir, fileName);
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, (response) => {
        const totalSize = parseInt(
          response.headers["content-length"] || "0",
          10
        );

        progressBar.start(totalSize, 0);

        response.pipe(file);

        let downloadedSize = 0;
        response.on("data", (chunk) => {
          downloadedSize += chunk.length;

          if (totalSize > 0 && downloadedSize > 0) {
            resolve({
              totalSize,
              filePath,
            });
          }

          const progress = downloadedSize;
          progressBar.update(Number(progress));
        });

        file.on("finish", () => {
          console.log(`\nDownload completed for ${filePath}`);
          // file.close(() => resolve(filePath));
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
