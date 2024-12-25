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

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, (response) => {
        const totalSize = parseInt(
          response.headers["content-length"] || "0",
          10
        );

        response.pipe(file);

        let isResolved = false;
        response.on("data", () => {
          if (!isResolved) {
            isResolved = true;
            resolve({ totalSize, filePath });
          }
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
