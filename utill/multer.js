const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      req.fileType = "image";

      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

module.exports = upload;
