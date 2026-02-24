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


router.get(
  "/get-orders",
  authMiddlewareBuyer,
  jobController.getOrdersForBuyer
);


module.exports = router;