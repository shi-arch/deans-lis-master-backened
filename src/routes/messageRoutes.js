const express = require("express");
const multer = require("multer");
const { sendMessage, getMessages, getRecentConversations } = require("../controllers/messageController");  // Add getRecentConversations
const authMiddlewareBuyer = require("../middleware/authMiddlewareBuyer");
const authMiddlewareSeller = require("../middleware/authMiddlewareSeller");

const router = express.Router();

// Multer for file uploads
const upload = multer({
  dest: 'public/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

// Combined auth (fixed chaining)
const authMiddleware = async (req, res, next) => {
  let authenticated = false;
  try {
    await new Promise((resolve) => authMiddlewareBuyer(req, res, (err) => {
      if (!err && req.user) authenticated = true;
      resolve();
    }));
    if (authenticated) return next();
  } catch {}

  try {
    await new Promise((resolve) => authMiddlewareSeller(req, res, (err) => {
      if (!err && req.user) authenticated = true;
      resolve();
    }));
    if (authenticated) return next();
  } catch {}

  return res.status(401).json({ success: false, message: "Unauthorized" });
};

// Routes
router.get("/:id", authMiddleware, getMessages);
router.post("/send/:id", authMiddleware, upload.single('file'), sendMessage);
router.get("/conversations", authMiddleware, getRecentConversations);  // New route for recent chats

module.exports = router;