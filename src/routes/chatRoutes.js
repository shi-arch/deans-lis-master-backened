const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddlewareBuyer = require('../middleware/authMiddlewareBuyer');
const authMiddlewareSeller = require('../middleware/authMiddlewareSeller');

// Middleware to allow either buyer or seller
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId }; // Set userId for controller
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Get all chats for the authenticated user (buyer or seller)
router.get('/chats', authMiddleware, chatController.getChats);

// Get specific chat between buyer and seller
router.get('/chat/:buyerId/:sellerId', authMiddleware, chatController.getChat);

module.exports = router;