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

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, (response) => {
        console.log(
          `HTTP GET request responded with status code ${response.statusCode}`
        );

        const totalSize = parseInt(
          response.headers["content-length"] || "0",
          10
        );
        let downloadedSize = 0;

        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
          console.log(`Download progress: ${progress}%`);
        });

        response.pipe(file);
        file.on("finish", () => {
          console.log(`Download completed for ${filePath}`);
          file.close(() => resolve(filePath));
        });
      })
      .on("error", (err) => {
        console.error(`Error downloading : ${err.message}`);
        fs.unlink(filePath, () => reject(err));
      });

    file.on("error", (err) => {
      console.error(`Error writing to file ${filePath}: ${err.message}`);
      fs.unlink(filePath, () => reject(err));
    });
  });
}
