import fs from "fs";
import type { Request, Response } from "express";
import path from "path";

export async function streamVideo(req: Request, res: Response) {
  const filePath = path.join(__dirname, "../../tmp/BigBuckBunny_640x360.m4v");

  const stat = fs.statSync(filePath);

  const fileSize = stat.size;

  const range = req.headers.range;

  let start = 0;
  let end = fileSize - 1;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    console.log("parts", parts);
    start = parseInt(parts[0], 10);
    end = parts[1] ? parseInt(parts[1], 10) : end;
  }

  const contentLength = end - start + 1;

  console.log("start", start, "end", end);

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Length", contentLength);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  res.setHeader("Accept-Ranges", "bytes");
  res.status(206);

  const stream = fs.createReadStream(filePath, {
    highWaterMark: 2 * 1024 * 1024,
  });

  const chunks: { chunk: ArrayBufferLike; size: number }[] = [];

  for await (const chunk of stream) {
    chunks.push({ chunk, size: chunk.length });
  }

  let bytesRead = 0;
  for (const { chunk, size } of chunks) {
    const chunkStart = bytesRead;
    const chunkEnd = bytesRead + size - 1;

    if (start > chunkEnd) {
      bytesRead += size;
      continue;
    }

    console.log("chunkStart", chunkStart, "chunkEnd", chunkEnd);

    const chunkContent = Buffer.from(chunk);

    const sliceStart = Math.max(start - chunkStart, 0);
    const sliceEnd = Math.min(end - chunkStart + 1, chunkContent.length);

    console.log("sliceStart", sliceStart, "sliceEnd", sliceEnd);

    res.write(chunkContent.subarray(sliceStart, sliceEnd));
  }

  res.end();
  console.log("done");
}
