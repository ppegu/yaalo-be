import multer from "multer";
import path from "path";

interface StorageProps {
  folderName: string;
}

const createMulterStorage = ({ folderName }: StorageProps) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "..", "..", "uploads", folderName));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });

  return multer({ storage });
};

export default createMulterStorage;
