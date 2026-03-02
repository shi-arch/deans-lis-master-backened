//routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
// const authMiddleware = require('../middleware/authMiddleware');
const authMiddlewareBuyer = require('../middleware/authMiddlewareBuyer');
const logger = require('../middleware/logger');

router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/buyer-image-upload', authController.buyerImageUpload);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/signin', authController.signin);
router.get('/validate-token', authController.validateToken);
router.get('/profile', authController.getProfile);
router.post('/update-profile', authMiddlewareBuyer, authController.updateProfile);
router.post('/google', authController.googleAuth); // New Google Auth route
router.post('/logout', authMiddlewareBuyer, authController.logout);

module.exports = router;