const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, callback) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueName}${path.extname(file.originalname).toLowerCase()}`);
  },
});

module.exports = multer({
  storage,
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image avatars are allowed"));
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});
