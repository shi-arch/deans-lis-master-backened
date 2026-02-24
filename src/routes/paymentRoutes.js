const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddlewareBuyer = require('../middleware/authMiddlewareBuyer');
const authMiddlewareSeller = require('../middleware/authMiddlewareSeller')
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use promises for async file operations
const { check } = require('express-validator'); // For parameter validation


// Debug middleware to log requests (exclude sensitive headers in production)
router.use((req, res, next) => {
  const logHeaders = { ...req.headers };
  if (process.env.NODE_ENV === 'production') {
    delete logHeaders.authorization; // Avoid logging sensitive tokens
  }
  console.log('=== JOB ROUTE REQUEST ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Headers:', logHeaders);
  next();
});
// Routes
router.post(
  '/create-transaction',
  authMiddlewareBuyer,
  (req, res, next) => {
    console.log('Post route - req.body:', req.body);
    console.log('Post route - req.files:', req.files);
    next();
  },
  paymentController.createTransaction  
);


module.exports = router;