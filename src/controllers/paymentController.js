const mongoose = require('mongoose');
const JobPost = require('../models/Job');
const Category = require('../models/category');

// **FIXED: Post job with proper validation and data handling**
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {transactionId, sellerId, orderId} = req.body;

    // Validate required fields
    const requiredFields = {
      title: 'Job title',
      description: 'Job description',
      duration: 'Duration',
      price: 'Price',
      state: 'State',
      city: 'City',
      zipCode: 'Zip code',
      location: 'Location',
      categories: 'Categories',
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field].toString().trim() === '') {
        return res.status(400).json({
          success: false,
          message: `${label} is required`,
        });
      }
    }

    // Parse location
    let parsedLocation;
    try {
      parsedLocation = JSON.parse(location);
      if (!parsedLocation.name || !parsedLocation.address || !parsedLocation.coordinates) {
        throw new Error('Incomplete location data');
      }
    } catch (error) {
      console.error('Location parsing error:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid location format. Location must include name, address, and coordinates.',
      });
    }

    // Parse arrays
    const categoriesArray = categories
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id) && id > 0);

    const genresArray = genres
      ? genres.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    const languagesArray = languages
      ? languages.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    const genderArray = gender
      ? gender.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    // Validate arrays
    if (categoriesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid category must be selected',
      });
    }
    if (genresArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid genre must be selected',
      });
    }
    if (languagesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid language must be selected',
      });
    }
    if (genderArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid gender must be selected',
      });
    }

    // Validate price
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number',
      });
    }

    // Validate state
    const stateIndex = parseInt(state);
    if (isNaN(stateIndex) || stateIndex < 1 || stateIndex > 50) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state selection',
      });
    }

    // Parse range
    let rangeValue = null;
    if (range && range.trim() !== '') {
      const rangeMatch = range.match(/\d+/);
      rangeValue = rangeMatch ? parseInt(rangeMatch[0]) : null;
    }

    // Validate date and time
    let jobDate, jobTime;
    try {
      jobDate = new Date(date);
      jobTime = new Date(time);
      if (isNaN(jobDate.getTime()) || isNaN(jobTime.getTime())) {
        throw new Error('Invalid date/time format');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date or time format',
      });
    }

    // Parse existing attachments
    let existingAttachmentsArray = [];
    if (existingAttachments && existingAttachments.trim() !== '') {
      try {
        existingAttachmentsArray = JSON.parse(existingAttachments);
        if (!Array.isArray(existingAttachmentsArray)) {
          throw new Error('Existing attachments must be an array');
        }
      } catch (error) {
        console.error('Existing attachments parsing error:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid existing attachments format',
        });
      }
    }

    // Parse deleted attachments
    let deletedAttachmentsArray = [];
    if (deletedAttachments && deletedAttachments.trim() !== '') {
      try {
        deletedAttachmentsArray = JSON.parse(deletedAttachments);
        if (!Array.isArray(deletedAttachmentsArray)) {
          throw new Error('Deleted attachments must be an array');
        }
      } catch (error) {
        console.error('Deleted attachments parsing error:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid deleted attachments format',
        });
      }
    }

    // Process new attachments
    const newAttachments = req.files
      ? req.files.map(file => ({
          name: file.originalname,
          url: `/Uploads/${file.filename}`, // Ensure this path is accessible
          type: file.mimetype,
          size: file.size,
        }))
      : [];

    // Filter out deleted attachments and combine with new ones
    const attachments = [
      ...existingAttachmentsArray.filter(
        att => !deletedAttachmentsArray.includes(att.url)
      ),
      ...newAttachments,
    ];

    // Delete physical files for deleted attachments
    const fs = require('fs').promises;
    const path = require('path');
    for (const url of deletedAttachmentsArray) {
      if (url.startsWith('/Uploads/')) {
        const filePath = path.join(__dirname, '../', url);
        try {
          // Check if the file is used by other jobs
          const otherJobsUsingFile = await JobPost.find({
            _id: { $ne: jobId },
            'attachments.url': url,
          });
          if (otherJobsUsingFile.length === 0) {
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`Successfully deleted file: ${filePath}`);
          } else {
            console.log(`File not deleted, used by other jobs: ${filePath}`);
          }
        } catch (error) {
          console.log(`File not found or already deleted: ${filePath}`);
        }
      }
    }

    // Create job post
    const jobPost = new JobPost({
      buyerId: req.user.userId,
      title,
      description,
      duration,
      price: numericPrice,
      isNegotiable: isNegotiable === 'true',
      date: jobDate,
      time: jobTime,
      state: stateIndex,
      city,
      zipCode,
      location: {
        name: parsedLocation.name,
        address: parsedLocation.address,
        coordinates: {
          type: 'Point',
          coordinates: parsedLocation.coordinates,
        },
      },
      range: rangeValue,
      categories: categoriesArray,
      genres: genresArray,
      languages: languagesArray,
      gender: genderArray,
      attachments,
      status: 'active',
    });

    const savedJobPost = await jobPost.save();
    console.log('Job post saved successfully:', savedJobPost._id);

    res.status(201).json({
      success: true,
      jobId: savedJobPost._id,
      message: 'Job posted successfully',
    });
  } catch (error) {
    console.error('Error in /api/jobs/post:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to post job. Please try again.',
    });
  }
};