const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const authController = require('../controllers/authController');

router.post('/form', enquiryController.submitEnquiry);

module.exports = router;