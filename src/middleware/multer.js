const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const cloudinary = require("cloudinary").v2;
//CLOUDINARY_URL=cloudinary://213157445611876:Cxw9BRgPYXWos3vw79fs16MeV4E@dojecevfr
cloudinary.config({
  cloud_name: "dojecevfr",
  api_key: "213157445611876",
  api_secret: "Cxw9BRgPYXWos3vw79fs16MeV4E"
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});
// Configure file storage for message attachments
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/uploads");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// Multer middleware for file uploads
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|mp4|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Unsupported file type"));
  },
});

module.exports = upload;