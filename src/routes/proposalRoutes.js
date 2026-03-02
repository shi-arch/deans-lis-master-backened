const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const authMiddlewareSeller = require('../middleware/authMiddlewareSeller');
const authMiddlewareBuyer = require('../middleware/authMiddlewareBuyer');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { check } = require('express-validator');

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
    const sanitizedName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(sanitizedName) || path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'audio/mpeg', 'audio/mp3', 'image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported types: MP4, MP3, JPEG, PNG, PDF'), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB limit, max 5 files
  fileFilter,
});

// Multer error handling
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File size exceeds 10MB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Maximum 5 files allowed' });
    }
    return res.status(400).json({ success: false, message: err.message || 'File upload error' });
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

// Debug middleware
router.use((req, res, next) => {
  const logHeaders = { ...req.headers };
  if (process.env.NODE_ENV === 'production') {
    delete logHeaders.authorization;
  }
  console.log('=== PROPOSAL ROUTE REQUEST ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', logHeaders);
  next();
});

// Conditional Multer middleware
const conditionalMulter = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
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

// Validation for proposal submission
const validateProposalSubmit = [
  check('jobId').isMongoId().withMessage('Invalid job ID format'),
  check('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  check('coverLetter').optional().isLength({ max: 1000 }).withMessage('Cover letter cannot exceed 1000 characters'),
];

// Validation for proposal update
const validateProposalUpdate = [
  check('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  check('coverLetter').optional().isLength({ max: 1000 }).withMessage('Cover letter cannot exceed 1000 characters'),
];

// Validation for proposal status update
const validateProposalStatus = [
  check('status').isIn(['active', 'rejected']).withMessage('Status must be active or rejected'),
];

// Routes
router.post(
  '/submit',
  authMiddlewareSeller,
  conditionalMulter,
  validateProposalSubmit,
  proposalController.submitProposal
);

router.patch(
  '/:id',
  //authMiddlewareSeller,
  conditionalMulter,
  validateProposalUpdate,
  proposalController.updateProposal
);

router.get(
  '/:id',
  authMiddlewareSeller,
  [check('id').isMongoId().withMessage('Invalid proposal ID format')],
  proposalController.getProposal
);

router.get(
  '/job/:jobId',
  authMiddlewareBuyer,
  [check('jobId').isMongoId().withMessage('Invalid job ID format')],
  proposalController.getProposalsForJob
);

router.patch( 
  '/:id/status',
  authMiddlewareBuyer,
  validateProposalStatus,
  proposalController.updateProposalStatus
);

router.get(
  '/web-job/:jobId/status',
  authMiddlewareSeller,
  [check('jobId').isMongoId().withMessage('Invalid job ID format')],
  proposalController.getProposalStatusForJob
);

router.delete(
  '/:id',
  authMiddlewareSeller,
  [check('id').isMongoId().withMessage('Invalid proposal ID format')],
  proposalController.deleteProposal
);

// Error handling for validation errors
router.use((err, req, res, next) => {
  if (err.array) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.array().map(e => e.msg) });
  }
  next(err);
});

module.exports = router;