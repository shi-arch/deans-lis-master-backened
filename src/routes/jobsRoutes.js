const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobsController');
const authMiddlewareBuyer = require('../middleware/authMiddlewareBuyer');
const authMiddlewareSeller = require('../middleware/authMiddlewareSeller')
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use promises for async file operations
const { check } = require('express-validator'); // For parameter validation

// Setup uploads directory
const uploadsDir = path.join(__dirname, '../Uploads');
(async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`Uploads directory ensured at: ${uploadsDir}`);
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
})();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const sanitizedName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(sanitizedName) || path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'audio/mpeg',
    'audio/mp3',
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported types: MP4, MP3, JPEG, PNG, PDF'), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Max 5 files
  },
  fileFilter,
});

// Error handling middleware for Multer
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
        message: 'Maximum 5 files allowed',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected field: ${err.field}. Expected 'attachments'`,
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

// Conditional Multer middleware
const conditionalMulter = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  console.log('Checking content type:', contentType);
  if (contentType.includes('multipart/form-data')) {
    console.log('Applying multer for multipart data');
    upload.array('attachments', 5)(req, res, err => {
      if (err) return handleMulterErrors(err, req, res, next);
      next();
    });
  } else {
    console.log('Skipping multer - not multipart data');
    next();
  }
};

// Validation for jobId parameter
const validateJobId = [
  check('id').isMongoId().withMessage('Invalid job ID format'),
];

// Validation for status update
const validateStatus = [
  check('status')
    .isIn(['active', 'paused', 'closed', 'draft'])
    .withMessage('Invalid status value. Must be one of: active, paused, closed, draft'),
];

// Routes
router.post(
  '/post',
  authMiddlewareBuyer,
  conditionalMulter,
  (req, res, next) => {
    console.log('Post route - req.body:', req.body);
    console.log('Post route - req.files:', req.files);
    next();
  },
  jobController.post
);

router.post(
  '/draft',
  authMiddlewareBuyer,
  conditionalMulter,
  (req, res, next) => {
    console.log('Draft route - req.body:', req.body);
    console.log('Draft route - req.files:', req.files);
    next();
  },
  jobController.saveDraft
);

router.get(
  '/job/:id',
  authMiddlewareBuyer,
  validateJobId,
  (req, res, next) => {
    console.log('Get job by ID route - jobId:', req.params.id);
    next();
  },
  jobController.getById
);



router.get(
  '/web-job-details/:id',
  authMiddlewareSeller,
  validateJobId,
  (req, res, next) => {
    console.log('Get job by ID route - jobId:', req.params.id);
    next();
  },
  jobController.getById
);
// router.get(
//   '/my-jobs',
//   authMiddlewareBuyer,
//   [
//     check('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
//     check('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
//     check('status')
//       .optional()
//       .isIn(['active', 'paused', 'closed', 'draft'])
//       .withMessage('Invalid status value'),
//   ],
//   (req, res, next) => {
//     console.log('Get my jobs route - buyerId:', req.user.userId);
//     next();
//   },
//   jobController.getMyJobs
// );

// Buyer route (requires login, paginated)
router.get(
  "/my-jobs",
  authMiddlewareBuyer,
  [
    check("page").optional().isInt({ min: 1 }),
    check("limit").optional().isInt({ min: 1, max: 100 }),
    check("status").optional().isIn(["active", "paused", "closed", "draft"]),
  ],
  jobController.getJobs
);


router.patch(
  '/job/:id',
  authMiddlewareBuyer,
  validateJobId,
  conditionalMulter,
  (req, res, next) => {
    console.log('Update job route - jobId:', req.params.id, 'body:', req.body, 'files:', req.files);
    next();
  },
  jobController.updateJob
);

router.delete(
  '/job/:id',
  authMiddlewareBuyer,
  validateJobId,
  (req, res, next) => {
    console.log('Delete job route - jobId:', req.params.id);
    next();
  },
  jobController.deleteJob
);

router.patch(
  '/job/:id/status',
  authMiddlewareBuyer,
  validateJobId,
  validateStatus,
  (req, res, next) => {
    console.log('Update job status route - jobId:', req.params.id, 'body:', req.body);
    if (typeof jobController.updateJobStatus !== 'function') {
      console.error('jobController.updateJobStatus is not a function:', jobController.updateJobStatus);
      return res.status(500).json({
        success: false,
        message: 'Internal server error: updateJobStatus handler is not defined',
      });
    }
    next();
  },
  jobController.updateJobStatus
);

// Test route without multer
router.post(
  '/test-simple',
  authMiddlewareBuyer,
  (req, res) => {
    console.log('Simple test - req.body:', req.body);
    res.json({ success: true, body: req.body });
  }
);

// Error handling for validation errors
router.use((err, req, res, next) => {
  if (err.array) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.array().map(e => e.msg),
    });
  }
  next(err);
});


// Public route (no login, latest 6 jobs)
router.get("/latest-jobs-website", jobController.getJobs);


//fetch job for the website
router.get(
  "/website-jobs",
  authMiddlewareSeller,
  jobController.getJobs
);

router.post(
  "/create-order",
  authMiddlewareBuyer,
  jobController.createOrder
);

router.post(
  "/update-order",
  authMiddlewareBuyer,
  jobController.updateOrder
);


router.get(
  "/get-orders",
  authMiddlewareBuyer,
  jobController.getOrdersForBuyer
);


module.exports = router;