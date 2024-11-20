import type { Request, Response } from "express";
import fs from "fs";

export async function streamVideo(
  metadata: { filePath: string },
  req: Request,
  res: Response
) {
  const { filePath } = metadata;

  const stat = fs.statSync(filePath);

  let fileSize = stat.size;

  if (!stat.isFile()) {
    res.status(404).send("File not found");
    return;
  }

  const range = req.headers.range || "bytes=0-";

  let [start, end] = range
    .replace(/bytes=/, "")
    .split("-")
    .map((x) => parseInt(x, 10));

  // Wait for the file to reach the required content length
  if (start >= stat.size) {
    await new Promise<void>((resolve, reject) => {
      console.log("Watching file for content length more than:", start);
      fs.watchFile(filePath, (curr) => {
        if (curr.size >= start) {
          fs.unwatchFile(filePath);
          fileSize = curr.size;
          resolve();
        }
      });

      setTimeout(() => {
        fs.unwatchFile(filePath);
        reject(
          new Error(
            "File size did not reach the required content length in time"
          )
        );
      }, 1000000); // Timeout after 100 seconds
    });
  }

  if (isNaN(end) || end === undefined) {
    end = fileSize - 1;
  }

  const contentLength = end - start + 1;

  console.log("start", start, "end", end, "fileSize", fileSize);

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Length", contentLength);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  res.setHeader("Accept-Ranges", "bytes");
  res.status(206);

  const stream = fs.createReadStream(filePath, {
    start,
    end,
  });

  stream.on("open", () => {
    stream.pipe(res, { end: false });
  });

  stream.on("error", (err) => {
    console.error("Stream error", err);
    res.status(500).send("Internal server error");
  });

  stream.on("end", () => {
    res.end();
  });

  req.on("close", () => {
    console.log("Request closed");
    stream.close();
  });

  req.on("end", () => {
    console.log("Request ended");
    stream.close();
  });

  req.on("aborted", () => {
    console.log("Request aborted");
    stream.close();
  });

  req.on("error", (err) => {
    console.error("Request error", err);
    stream.close();
  });
}
