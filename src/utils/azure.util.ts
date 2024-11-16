import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import Logger from "./Logger";

const logger = Logger.createLogger("azure.util");

const AZURE_ACCOUNT_KEY = process.env.AZURE_ACCOUNT_KEY;

const AZURE_STORAGE_CONNECTION_STRING = `DefaultEndpointsProtocol=https;AccountName=movieapp;AccountKey=${AZURE_ACCOUNT_KEY};EndpointSuffix=core.windows.net`;

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Azure Storage Connection string not found");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING
);

export async function downloadFile(fileUrl: string): Promise<string> {
  logger.log(`Starting download of file from URL: ${fileUrl}`);

  // Ensure the temp directory exists
  const tempDir = path.join(__dirname, "../../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    logger.log(`Created temporary directory at: ${tempDir}`);
  }

  const tempFilePath = path.join(tempDir, uuidv4());

  const response = await axios.get(fileUrl, { responseType: "stream" });
  const writer = fs.createWriteStream(tempFilePath);

  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  logger.log(`File downloaded to temporary path: ${tempFilePath}`);
  return tempFilePath;
}

export async function uploadUrlToAzure(
  containerName: string,
  fileUrl: string,
  fileName: string,
  folderName?: string
): Promise<string> {
  logger.log(
    `Starting upload of file from URL: ${fileUrl} to Azure container: ${containerName}`
  );

  const containerClient: ContainerClient =
    blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  logger.log(`Ensured container ${containerName} exists`);

  const blobName = `${
    folderName ? `${folderName}/` : ""
  }${fileName}-${uuidv4()}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Download the file from the URL
  const tempFilePath = await downloadFile(fileUrl);
  logger.log(`Downloaded file to temporary path: ${tempFilePath}`);

  // Upload the file to Azure Blob Storage
  const uploadBlobResponse = await blockBlobClient.uploadFile(tempFilePath);
  logger.log(
    `Uploaded file to Azure Blob Storage with blob name: ${blobName}`,
    {
      requestId: uploadBlobResponse.requestId,
    }
  );

  // Clean up the temporary file
  fs.unlinkSync(tempFilePath);
  logger.log(`Deleted temporary file: ${tempFilePath}`);

  return blockBlobClient.url;
}

export async function createFolderInContainer(
  containerName: string,
  folderName: string
): Promise<void> {
  logger.log(
    `Starting creation of folder: ${folderName} in container: ${containerName}`
  );

  const containerClient: ContainerClient =
    blobServiceClient.getContainerClient(containerName);

  const blobName = encodeURIComponent(`${folderName}/`);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Check if the folder already exists
  const exists = await blockBlobClient.exists();
  if (exists) {
    logger.log(
      `Folder ${folderName} already exists in container ${containerName}`
    );
    return;
  }

  // Create an empty blob to represent the folder
  try {
    await blockBlobClient.upload("", 0);
    logger.log(
      `Folder ${folderName} created successfully in container ${containerName}`
    );
  } catch (error) {
    logger.error(
      `Failed to create folder ${folderName} in container ${containerName}`,
      error
    );
    throw error;
  }
}
