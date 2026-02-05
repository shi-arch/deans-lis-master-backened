// Import required dependencies
const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController'); // Controller for seller-related operations
const categoryController = require('../controllers/categoriesController'); // Controller for category-related operations
const userActionsController = require('../controllers/userActionsController'); // Controller for user actions like favoriting
const authMiddleware = require('../middleware/authMiddlewareSeller'); // Middleware to authenticate seller requests
const authMiddlewareBuyer = require('../middleware/authMiddlewareBuyer'); // Middleware to authenticate buyer requests
const multer = require('multer'); // Middleware for handling file uploads
const path = require('path'); // For handling file paths
const fs = require('fs').promises; // For async file system operations

// Setup uploads directory for storing uploaded files (images, videos, audio)
const uploadsDir = path.join(__dirname, '../../public/uploads');
(async () => {
  try {
    // Create the Uploads directory if it doesn't exist
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`Seller uploads directory ensured at: ${uploadsDir}`);
  } catch (error) {
    console.error('Error creating seller uploads directory:', error);
  }
})();

// Configure Multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in the Uploads directory
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to avoid conflicts
    const sanitizedName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(sanitizedName) || path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

// Validate file types for uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg', 'audio/mp3'];
  if (allowedTypes.includes(file.mimetype)) {
    // Accept valid file types
    cb(null, true);
  } else {
    // Reject invalid file types with an error message
    cb(new Error('Invalid file type. Supported types: JPEG, PNG, MP4, MP3'), false);
  }
};

// Configure Multer with storage, limits, and file filter
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 15, // Maximum 15 files total
  },
  fileFilter,
});

// Middleware to handle Multer-specific errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Maximum 15 files allowed',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next(err); // Pass non-Multer errors to the default error handler
};

// Routes (specific routes before dynamic routes to avoid conflicts)
// POST route to sign up a new seller
router.post('/signup', sellerController.signup);

// POST route to sign in a seller
router.post('/signin', sellerController.signin);

// GET route to retrieve saved talents for a buyer (requires buyer authentication)
router.get('/saved', authMiddlewareBuyer, userActionsController.getSavedTalents);

// GET route to retrieve all subcategories
router.get('/categories/subcategories', categoryController.getSubcategories);

// GET route to retrieve categories with their subcategories
router.get('/categories/categories', categoryController.getCategoriesWithSubcategories);

// GET route for website pages to retrieve categories with subcategories
router.get('/web_categories/categories', categoryController.getCategoriesWithSubcategories);

// POST route to allow buyers to favorite/unfavorite a seller (requires buyer authentication)
router.post('/:sellerId/favorite', authMiddlewareBuyer, userActionsController.toggleFavorite);

// GET route to retrieve all sellers
router.get('/', sellerController.getSellers);

// GET route to retrieve a specific seller by ID
router.get('/:id', sellerController.getSellerById);

// PUT route to edit a seller's profile, including file uploads for image, portfolio, and stories
router.put(
  '/edit/:id',
  authMiddleware, // Ensure only authenticated sellers can edit their profile
  upload.fields([
    { name: 'image', maxCount: 1 }, // Single profile image
    { name: 'portfolio', maxCount: 10 }, // Up to 10 portfolio files (video/audio/image)
    { name: 'stories', maxCount: 10 }, // Up to 10 story files (video/image)
  ]),
  handleMulterErrors, // Handle file upload errors
  sellerController.editSeller // Controller to process the edit request
);

// DELETE route to delete a seller's profile (requires seller authentication)
router.delete('/:id', authMiddleware, sellerController.deleteSeller);

// PUT route to update a seller's availability (requires seller authentication)
router.put('/:id/availability', authMiddleware, sellerController.availability);

// Export the router
module.exports = router;