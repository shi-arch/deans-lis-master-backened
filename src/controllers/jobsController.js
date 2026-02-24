const mongoose = require('mongoose');
const JobPost = require('../models/Job');
const Category = require('../models/category');

// **FIXED: Post job with proper validation and data handling**
exports.post = async (req, res) => {
  try {
    console.log('FormData received:', req.body);
    console.log('Files received:', req.files);

    const {
      title,
      description,
      duration,
      price,
      isNegotiable,
      date,
      time,
      state,
      city,
      zipCode,
      location,
      range,
      categories,
      genres,
      languages,
      gender,
      existingAttachments,
      deletedAttachments,
    } = req.body;

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

// **FIXED: Draft saving functionality with proper validation**
exports.saveDraft = async (req, res) => {
  try {
    console.log('Saving draft with data:', req.body);
    console.log('Files for draft:', req.files);

    const {
      title,
      description,
      duration,
      price,
      isNegotiable,
      date,
      time,
      state,
      city,
      zipCode,
      location,
      range,
      categories,
      genres,
      languages,
      gender,
      existingAttachments,
      deletedAttachments,
    } = req.body;

    // Validate title
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required for saving draft',
      });
    }

    // Parse location
    let parsedLocation = null;
    if (location && location.trim() !== '') {
      try {
        parsedLocation = JSON.parse(location);
        if (!parsedLocation.coordinates || !Array.isArray(parsedLocation.coordinates)) {
          parsedLocation = null;
        }
      } catch (error) {
        console.error('Location parsing error for draft:', error);
        parsedLocation = null;
      }
    }

    // Parse arrays
    const categoriesArray = categories && categories.trim() !== ''
      ? categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    const genresArray = genres && genres.trim() !== ''
      ? genres.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    const languagesArray = languages && languages.trim() !== ''
      ? languages.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    const genderArray = gender && gender.trim() !== ''
      ? gender.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : [];

    // Parse numeric fields
    const numericPrice = price && price.trim() !== '' ? parseFloat(price) : 0;
    const stateIndex = state && state.trim() !== '' ? parseInt(state) : 1;

    let rangeValue = null;
    if (range && range.trim() !== '') {
      const rangeMatch = range.match(/\d+/);
      rangeValue = rangeMatch ? parseInt(rangeMatch[0]) : null;
    }

    // Parse dates
    let jobDate = new Date();
    let jobTime = new Date();
    if (date && date.trim() !== '') {
      try {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          jobDate = parsedDate;
        }
      } catch (error) {
        console.log('Date parsing failed, using current date');
      }
    }
    if (time && time.trim() !== '') {
      try {
        const parsedTime = new Date(time);
        if (!isNaN(parsedTime.getTime())) {
          jobTime = parsedTime;
        }
      } catch (error) {
        console.log('Time parsing failed, using current time');
      }
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
          url: `/Uploads/${file.filename}`,
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
      const filePath = path.join(__dirname, '../', url);
      try {
        if (await fs.access(filePath).then(() => true).catch(() => false)) {
          await fs.unlink(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    }

    // Create draft job post
    const draftData = {
      buyerId: req.user.userId,
      title,
      description: description || '',
      duration: duration || '1 Month',
      price: numericPrice,
      isNegotiable: isNegotiable === 'true',
      date: jobDate,
      time: jobTime,
      state: stateIndex,
      city: city || '',
      zipCode: zipCode || '',
      location: parsedLocation
        ? {
            name: parsedLocation.name,
            address: parsedLocation.address,
            coordinates: {
              type: 'Point',
              coordinates: parsedLocation.coordinates,
            },
          }
        : {
            name: 'TBD',
            address: 'TBD',
            coordinates: {
              type: 'Point',
              coordinates: [0, 0],
            },
          },
      range: rangeValue,
      categories: categoriesArray,
      genres: genresArray,
      languages: languagesArray,
      gender: genderArray,
      attachments,
      status: 'draft',
    };

    console.log('Creating draft with data:', draftData);

    const jobPost = new JobPost(draftData);
    const savedDraft = await jobPost.save();

    console.log('Draft saved successfully:', savedDraft._id);

    res.status(201).json({
      success: true,
      draftId: savedDraft._id,
      message: 'Draft saved successfully',
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Draft validation failed. Some fields may be incomplete.',
        details: Object.keys(error.errors).join(', '),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to save draft. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// **FIXED: Get job by ID with better error handling**
// exports.getById = async (req, res) => {
//   try {
//     const jobId = req.params.id;
    
//     // Validate ObjectId format
//     if (!mongoose.Types.ObjectId.isValid(jobId)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Invalid job ID format' 
//       });
//     }

//     const job = await JobPost.findById(jobId);
//     if (!job) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Job post not found' 
//       });
//     }

//     // Fetch categories for mapping
//     const categories = await Category.find();
//     const subcategoryMap = categories.reduce((acc, cat) => {
//       cat.subcategories.forEach(sub => {
//         acc[sub.subcategory_id] = { name: sub.name, category: cat.name };
//       });
//       return acc;
//     }, {});

//     // **FIXED: Use constants that match frontend**
//     const genresOptions = ['Jazz', 'Country', 'Gospel', 'Christian', 'RnB', 'Pop', 'Blues', 'Funk'];
//     const languageOptions = ['English', 'French', 'Spanish', 'Hindi', 'Urdu'];
//     const genderOptions = ['Male', 'Female', 'Other'];

//     const jobData = {
//       id: job._id,
//       buyerId: job.buyerId,
//       title: job.title,
//       description: job.description,
//       duration: job.duration,
//       price: job.price,
//       isNegotiable: job.isNegotiable,
//       date: job.date,
//       time: job.time,
//       state: job.state, // Return index, frontend will map to name
//       city: job.city,
//       zipCode: job.zipCode,
//       location: {
//         name: job.location.name,
//         address: job.location.address,
//         coordinates: job.location.coordinates.coordinates, // [longitude, latitude]
//       },
//       range: job.range,
//       categories: job.categories.map(id => ({
//         subcategory_id: id,
//         name: subcategoryMap[id]?.name || 'Unknown',
//         category: subcategoryMap[id]?.category || 'Unknown',
//       })),
//       genres: job.genres.map(index => ({
//         id: index,
//         name: genresOptions[index - 1] || 'Unknown', // Convert to 0-based index
//       })),
//       languages: job.languages.map(index => ({
//         id: index,
//         name: languageOptions[index - 1] || 'Unknown', // Convert to 0-based index
//       })),
//       gender: job.gender.map(index => ({
//         id: index,
//         name: genderOptions[index - 1] || 'Unknown', // Convert to 0-based index
//       })),
//       attachments: job.attachments,
//       status: job.status,
//       createdAt: job.createdAt,
//       updatedAt: job.updatedAt,
//     };

//     res.status(200).json({ success: true, data: jobData });
//   } catch (error) {
//     console.error('Error fetching job post:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while fetching job details', 
//       error: error.message 
//     });
//   }
// };


const { validationResult } = require('express-validator');
// const mongoose = require('mongoose');
const {
  getGenreIdByName,
  getGenreNameById,
  getLanguageIdByName,
  getLanguageNameById,
  getGenderIdByName,
  getGenderNameById,
  getStateIdByName,
  getStateNameById,
  GENRES,
  LANGUAGES,
  GENDERS,
  STATES,
} = require('../utils/constants');
const Order = require('../models/models_backup/Order');


exports.getById = async (req, res) => {
  try {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg),
      });
    }

    const jobId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid job ID format' 
      });
    }

    // Populate buyerId to get buyer details
    const job = await JobPost.findById(jobId).populate('buyerId', 'firstName lastName city zipCode');
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job post not found' 
      });
    }

    // Fetch categories for mapping
    const categories = await Category.find();
    const subcategoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach(sub => {
        acc[sub.subcategory_id] = { name: sub.name, category: cat.name };
      });
      return acc;
    }, {});

    const jobData = {
      id: job._id,
      buyerId: job.buyerId,
      title: job.title,
      description: job.description,
      duration: job.duration,
      price: job.price,
      isNegotiable: job.isNegotiable,
      date: job.date,
      time: job.time,
      state: job.state ? getStateNameById(job.state) || 'Unknown' : 'Unknown',
      city: job.city,
      zipCode: job.zipCode,
      location: {
        name: job.location.name,
        address: job.location.address,
        coordinates: job.location.coordinates.coordinates,
      },
      range: job.range,
      categories: job.categories.map(id => ({
        subcategory_id: id,
        name: subcategoryMap[id]?.name || 'Unknown',
        category: subcategoryMap[id]?.category || 'Unknown',
      })),
      genres: job.genres.map(id => ({
        id,
        name: getGenreNameById(id) || 'Unknown',
      })),
      languages: job.languages.map(id => ({
        id,
        name: getLanguageNameById(id) || 'Unknown',
      })),
      gender: job.gender.map(id => ({
        id,
        name: getGenderNameById(id) || 'Unknown',
      })),
      attachments: job.attachments,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      clientInfo: {
        // name: `${job.buyerId.firstName} ${job.buyerId.lastName || ''}`.trim(),
        city: job.buyerId?.city || "unknown",
        state: `${getStateNameById(job.state) || 'Unknown'}`,
        rating: 4.5, // Mock rating as backend doesn't provide it
        totalRatings: 40, // Mock totalRatings as backend doesn't provide it
      },
    };

    res.status(200).json({ success: true, data: jobData });
  } catch (error) {
    console.error('Error fetching job post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching job details', 
      error: error.message 
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const buyerId = req.user.userId; // From authMiddlewareBuyer
    const {jobId, applicationId, sellerId, amount, paymentStatus, date, time, location, coordinates, status} = req.body
    if (!sellerId || !amount || !date || !time || !location || !coordinates || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: jobId, applicationId, buyerId, sellerId, amount',
      });
    }
     const validObjectId = (id) =>
      id && mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : undefined;
    const newOrder = await Order.create({
      orderId: Math.random().toString(36).substr(2, 9), // Generate a random order ID
      jobId: validObjectId(jobId) || "",
      applicationId: validObjectId(applicationId) || "",
      buyerId: new mongoose.Types.ObjectId(buyerId),
      sellerId: new mongoose.Types.ObjectId(sellerId),
      payment: {amount, status: paymentStatus || "Pending"},
      schedule: {
        date: new Date(date),
        time: new Date(time),
        location: location || "Bangalore, MG Road",
        coordinates: coordinates
      },
      status: status,
      timeRemaining: "2 days"
    });
    newOrder.save()
    res.status(201).json({
      success: true,
      orderId: newOrder._id,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message,
    });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const {updateData, orderId} = req.body;
    const updatedOrder = await Order.findOneAndUpdate({ _id: orderId }, {...updateData}, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order',
      error: error.message,
    });
  }
};

exports.getOrdersForBuyer = async (req, res) => {
  try {
    const buyerId = req.user.userId; // From authMiddlewareBuyer    
    const orders = await Order.find({ buyerId }).populate('jobId applicationId sellerId');
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching orders for buyer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders for buyer',
      error: error.message,
    });
  }
};

// Get jobs for the authenticated buyer with pagination and status filter
// exports.getMyJobs = async (req, res) => {
//   try {
//     const buyerId = req.user.userId; // From authMiddlewareBuyer
//     const { status, page = 1, limit = 10 } = req.query;

//     // Validate pagination parameters
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     if (isNaN(pageNum) || pageNum < 1) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid page number',
//       });
//     }
//     if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid limit value (must be between 1 and 100)',
//       });
//     }

//     // Build query
//     const query = { buyerId };
//     if (status && ['active', 'paused', 'closed', 'draft'].includes(status.toLowerCase())) {
//       query.status = status.toLowerCase();
//     }

//     // Fetch jobs with pagination
//     const jobs = await JobPost.find(query)
//       .sort({ createdAt: -1 })
//       .skip((pageNum - 1) * limitNum)
//       .limit(limitNum);

//     // Get total count for pagination
//     const totalJobs = await JobPost.countDocuments(query);
//     const hasMore = pageNum * limitNum < totalJobs;

//     // Fetch categories for mapping
//     const categories = await Category.find();
//     const subcategoryMap = categories.reduce((acc, cat) => {
//       cat.subcategories.forEach(sub => {
//         acc[sub.subcategory_id] = { name: sub.name, category: cat.name };
//       });
//       return acc;
//     }, {});

//     // Constants to map indices to names (same as frontend)
//     const genresOptions = ['Jazz', 'Country', 'Gospel', 'Christian', 'RnB', 'Pop', 'Blues', 'Funk'];
//     const languageOptions = ['English', 'French', 'Spanish', 'Hindi', 'Urdu'];
//     const genderOptions = ['Male', 'Female', 'Other'];

//     // Map jobs to the desired format
//     const jobData = jobs.map(job => ({
//       id: job._id,
//       buyerId: job.buyerId,
//       title: job.title,
//       description: job.description,
//       duration: job.duration,
//       price: job.price,
//       isNegotiable: job.isNegotiable,
//       date: job.date,
//       time: job.time,
//       state: job.state,
//       city: job.city,
//       zipCode: job.zipCode,
//       location: {
//         name: job.location.name,
//         address: job.location.address,
//         coordinates: job.location.coordinates.coordinates, // [longitude, latitude]
//       },
//       range: job.range,
//       categories: job.categories.map(id => ({
//         subcategory_id: id,
//         name: subcategoryMap[id]?.name || 'Unknown',
//         category: subcategoryMap[id]?.category || 'Unknown',
//       })),
//       genres: job.genres.map(index => ({
//         id: index,
//         name: genresOptions[index - 1] || 'Unknown',
//       })),
//       languages: job.languages.map(index => ({
//         id: index,
//         name: languageOptions[index - 1] || 'Unknown',
//       })),
//       gender: job.gender.map(index => ({
//         id: index,
//         name: genderOptions[index - 1] || 'Unknown',
//       })),
//       attachments: job.attachments,
//       status: job.status,
//       createdAt: job.createdAt,
//       updatedAt: job.updatedAt,
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         jobs: jobData,
//         hasMore,
//         page: pageNum,
//         limit: limitNum,
//         total: totalJobs,
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching buyer jobs:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while fetching jobs',
//       error: error.message,
//     });
//   }
// };

// Unified function: Works for both buyer (auth) and public (no login)
// exports.getJobs = async (req, res) => {
//   try {
//     let query = {};
//     let jobs;
//     let totalJobs = 0;
//     let hasMore = false;

//     // ============================
//     // Case 1: Buyer (logged in)
//     // ============================
//     if (req.user?.userId) {
//       const buyerId = req.user.userId;
//       const { status, page = 1, limit = 10 } = req.query;

//       const pageNum = parseInt(page);
//       const limitNum = parseInt(limit);

//       // Validate pagination
//       if (isNaN(pageNum) || pageNum < 1) {
//         return res.status(400).json({ success: false, message: "Invalid page number" });
//       }
//       if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
//         return res.status(400).json({ success: false, message: "Invalid limit value (1–100)" });
//       }

//       query = { buyerId };
//       if (status && ["active", "paused", "closed", "draft"].includes(status.toLowerCase())) {
//         query.status = status.toLowerCase();
//       }

//       jobs = await JobPost.find(query)
//         .sort({ createdAt: -1 })
//         .skip((pageNum - 1) * limitNum)
//         .limit(limitNum);

//       totalJobs = await JobPost.countDocuments(query);
//       hasMore = pageNum * limitNum < totalJobs;

//       // Continue to mapping logic below 👇
//     }

//     // ============================
//     // Case 2: Public Website (no login)
//     // ============================
//     else {
//       query = { status: "active" };

//       jobs = await JobPost.find(query)
//         .sort({ createdAt: -1 })
//         .limit(18);

//       // No pagination here
//     }

//     // ============================
//     // Common Mapping
//     // ============================
//     const categories = await Category.find();
//     const subcategoryMap = categories.reduce((acc, cat) => {
//       cat.subcategories.forEach((sub) => {
//         acc[sub.subcategory_id] = { name: sub.name, category: cat.name };
//       });
//       return acc;
//     }, {});

//     const genresOptions = ["Jazz", "Country", "Gospel", "Christian", "RnB", "Pop", "Blues", "Funk"];
//     const languageOptions = ["English", "French", "Spanish", "Hindi", "Urdu"];
//     const genderOptions = ["Male", "Female", "Other"];

//     const jobData = jobs.map((job) => ({
//       id: job._id,
//       buyerId: job.buyerId,
//       title: job.title,
//       description: job.description,
//       duration: job.duration,
//       price: job.price,
//       isNegotiable: job.isNegotiable,
//       date: job.date,
//       time: job.time,
//       state: job.state,
//       city: job.city,
//       zipCode: job.zipCode,
//       location: {
//         name: job.location?.name || "",
//         address: job.location?.address || "",
//         coordinates: job.location?.coordinates?.coordinates || [],
//       },
//       range: job.range,
//       categories: job.categories.map((id) => ({
//         subcategory_id: id,
//         name: subcategoryMap[id]?.name || "Unknown",
//         category: subcategoryMap[id]?.category || "Unknown",
//       })),
//       genres: job.genres.map((index) => ({
//         id: index,
//         name: genresOptions[index - 1] || "Unknown",
//       })),
//       languages: job.languages.map((index) => ({
//         id: index,
//         name: languageOptions[index - 1] || "Unknown",
//       })),
//       gender: job.gender.map((index) => ({
//         id: index,
//         name: genderOptions[index - 1] || "Unknown",
//       })),
//       attachments: job.attachments,
//       status: job.status,
//       createdAt: job.createdAt,
//       updatedAt: job.updatedAt,
//     }));

//     // ============================
//     // Response
//     // ============================
//     if (req.user?.userId) {
//       // Buyer response with pagination info
//       return res.status(200).json({
//         success: true,
//         data: {
//           jobs: jobData,
//           hasMore,
//           page: parseInt(req.query.page) || 1,
//           limit: parseInt(req.query.limit) || 10,
//           total: totalJobs,
//         },
//       });
//     } else {
//       // Public response (latest 6)
//       return res.status(200).json({
//         success: true,
//         data: jobData,
//       });
//     }
//   } catch (error) {
//     console.error("Error fetching jobs:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching jobs",
//       error: error.message,
//     });
//   }
// };



// controllers/jobController.js



// const { validationResult } = require('express-validator');
// const {
//   getGenreIdByName,
//   getLanguageIdByName,
//   getGenderIdByName,
//   getStateIdByName,
//   GENRES,
//   LANGUAGES,
//   GENDERS,
//   STATES,
// } = require('../utils/constants');

exports.getJobs = async (req, res) => {
  try {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg),
      });
    }

    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;
    const category = req.query.category || '';
    const subcategories = req.query.subcategories ? req.query.subcategories.split(',') : [];
    const priceRange = req.query.price_range ? req.query.price_range.split(',') : [];
    const genres = req.query.genres ? req.query.genres.split(',') : [];
    const languages = req.query.languages ? req.query.languages.split(',') : [];
    const gender = req.query.gender ? req.query.gender.split(',') : [];
    const zipCode = req.query.zip_code || '';
    // const range = parseInt(req.query.range) || 0;

    const availabilityDate = req.query.availability_date || '';
    const state = req.query.state || '';
    const searchQuery = req.query.search || '';
     

    // Determine user type and route
    const isBuyer = req.user && req.originalUrl.includes('/my-jobs');
    const isSeller = req.user && req.originalUrl.includes('/website-jobs');
    const isPublic = req.originalUrl.includes('/latest-jobs-website') || (!req.user && req.originalUrl.includes('/website-jobs'));

    let query = {};
    let sort = { createdAt: -1 };
    let responseLimit = limit;
    let totalJobs = 0;
    let hasMore = false;

    // Fetch categories for subcategory mapping
    const categories = await Category.find();
    const subcategoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach((sub) => {
        acc[sub.subcategory_id] = { name: sub.name, category: cat.name };
        acc[sub.name.toLowerCase().trim()] = sub.subcategory_id;
        acc[sub.name.toLowerCase().replace(/\s+/g, '-')] = sub.subcategory_id;
      });
      return acc;
    }, {});

    // ============================
    // Case 1: Buyer (logged in, /my-jobs)
    // ============================
    if (isBuyer) {
      query.buyerId = req.user.userId;
      if (status && ['active', 'paused', 'closed', 'draft'].includes(status.toLowerCase())) {
        query.status = status.toLowerCase();
      }

      totalJobs = await JobPost.countDocuments(query);
      hasMore = page * limit < totalJobs;

      jobs = await JobPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
    }
    // ============================
    // Case 2: Seller (logged in, /website-jobs)
    // ============================
    else if (isSeller) {
      query.status = 'active';

      // Handle category and subcategory filters
      let serviceIds = [];
      if (subcategories.length > 0) {
        serviceIds = subcategories
          .map(sub => {
            const normalizedSub = sub.toLowerCase().trim();
            return subcategoryMap[normalizedSub] || subcategoryMap[normalizedSub.replace(/\s+/g, '-')];
          })
          .filter(id => id);
        if (serviceIds.length === 0 && subcategories.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid subcategories provided.',
          });
        }
      } else if (category) {
        const categoryKey = category.toLowerCase().trim();
        const serviceId = subcategoryMap[categoryKey] || subcategoryMap[categoryKey.replace(/\s+/g, '-')];
        if (serviceId) {
          serviceIds.push(serviceId);
        } else {
          return res.status(400).json({
            success: false,
            message: `Invalid category: ${category}.`,
          });
        }
      }
      if (serviceIds.length > 0) {
        query.categories = { $in: serviceIds };
      }

      // Handle price range filter
      if (priceRange.length > 0) {
        const priceFilters = priceRange.map(range => {
          switch (range.trim()) {
            case 'Less than $100':
              return { price: { $lte: 100 } };
            case '$100 to $500':
              return { price: { $gte: 100, $lte: 500 } };
            case '$500 to $1K':
              return { price: { $gte: 500, $lte: 1000 } };
            case '$1K to $5K':
              return { price: { $gte: 1000, $lte: 5000 } };
            case '$5K+':
              return { price: { $gte: 5000 } };
            default:
              return null;
          }
        }).filter(filter => filter);
        if (priceFilters.length > 0) {
          query.$or = query.$or ? [...query.$or, ...priceFilters] : priceFilters;
        }
      }

      // Handle genres filter
      if (genres.length > 0) {
        const genreIds = genres
          .map(name => getGenreIdByName(name.trim()))
          .filter(id => id);
        if (genreIds.length > 0) {
          query.genres = { $in: genreIds };
        }
      }

      // Handle languages filter
      if (languages.length > 0) {
        const languageIds = languages
          .map(name => getLanguageIdByName(name.trim()))
          .filter(id => id);
        if (languageIds.length > 0) {
          query.languages = { $in: languageIds };
        }
      }

      // Handle gender filter
      if (gender.length > 0) {
        const genderIds = gender
          .map(name => getGenderIdByName(name.trim()))
          .filter(id => id);
        if (genderIds.length > 0) {
          query.gender = { $in: genderIds };
        }
      }

      // Handle zip code filter
      if (zipCode) {
        query.zipCode = zipCode;
      }
      // Handle range filter
      // if (range > 0) {
      //   query.range = { $lte: range };
      // }

      // Parse range from query parameter (e.g., "Within 100 miles" -> 100)
      let range = 0;
      if (req.query.range) {
        const match = req.query.range.match(/\d+/); // Extract number from string
        range = match ? parseInt(match[0]) : 0; // Convert to number, default to 0 if invalid
      }

      // Handle range filter
      if (range > 0) {
        query.range = { $lte: range };
      }

      // Handle state filter
      if (state) {
        const stateId = getStateIdByName(state.trim());
        if (stateId) {
          query.state = stateId;
        }
      }

      // Handle availability date filter
      if (availabilityDate) {
        const date = new Date(availabilityDate);
        if (!isNaN(date.getTime())) {
          const startOfDay = new Date(date.setHours(0, 0, 0, 0));
          query.date = { $ne: startOfDay };
        }
      }

      if (searchQuery && searchQuery.trim() !== '') {
        const searchFilter = {
          $or: [
            { title: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } },
          ],
        };
        // If other filters exist, combine with $and
        if (Object.keys(query).length > 1) { // >1 to exclude status
          query.$and = [{ ...query }, searchFilter];
        } else {
          query = { ...query, ...searchFilter };
        }
      }

      

      totalJobs = await JobPost.countDocuments(query);
      hasMore = page * limit < totalJobs;

      jobs = await JobPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);  
    }
    // ============================
    // Case 3: Public Website (no login)
    // ============================
    else {
      query.status = 'active';
      responseLimit = 6;

      jobs = await JobPost.find(query)
        .sort(sort)
        .limit(responseLimit);
    }

    // ============================
    // Common Mapping
    // ============================
    const genresOptions = GENRES.map(g => g.name);
    const languageOptions = LANGUAGES.map(l => l.name);
    const genderOptions = GENDERS.map(g => g.name);
    const { getStateNameById } = require('../utils/constants');

    const jobData = jobs.map((job) => ({
      id: job._id,
      // buyerId: job.buyerId,
      title: job.title,
      description: job.description,
      duration: job.duration,
      price: job.price,
      isNegotiable: job.isNegotiable,
      date: job.date,
      time: job.time,
      state: job.state ? getStateNameById(job.state) || 'Unknown' : 'Unknown',
      city: job.city,
      // zipCode: job.zipCode,
      // location: {
      //   name: job.location?.name || '',
      //   address: job.location?.address || '',
      //   coordinates: job.location?.coordinates?.coordinates || [],
      // },
      // range: job.range,
      // categories: job.categories.map((id) => ({
      //   subcategory_id: id,
      //   name: subcategoryMap[id]?.name || 'Unknown',
      //   category: subcategoryMap[id]?.category || 'Unknown',
      // })),
      // genres: job.genres.map((index) => ({
      //   id: index,
      //   name: genresOptions[index - 1] || 'Unknown',
      // })),
      // languages: job.languages.map((index) => ({
      //   id: index,
      //   name: languageOptions[index - 1] || 'Unknown',
      // })),
      // gender: job.gender.map((index) => ({
      //   id: index,
      //   name: genderOptions[index - 1] || 'Unknown',
      // })),
      // attachments: job.attachments,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    // ============================
    // Response
    // ============================
    if (isBuyer || isSeller) {
      return res.status(200).json({
        success: true,
        data: {
          jobs: jobData,
          hasMore,
          page,
          limit,
          total: totalJobs,
        },
        // debug: isSeller ? {
        //   query,
        //   category,
        //   subcategories,
        //   priceRange,
        //   genres,
        //   languages,
        //   gender,
        //   zipCode,
        //   range,
        //   availabilityDate,
        //   state,
        // } : undefined,
      });
    } else {
      return res.status(200).json({
        success: true,
        data: jobData,
      });
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching jobs',
      error: error.message,
    });
  }
};

// Update job 
// Fixed updateJob function in jobsController.js
exports.updateJob = async (req, res) => {
  try {
    console.log('Updating job with data:', req.body);
    console.log('Files received:', req.files);

    const jobId = req.params.id;
    const userId = req.user.userId;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format',
      });
    }

    // Check if job exists and belongs to the buyer
    const job = await JobPost.findOne({ _id: jobId, buyerId: userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update it',
      });
    }

    const {
      title,
      description,
      duration,
      price,
      isNegotiable,
      date,
      time,
      state,
      city,
      zipCode,
      location,
      range,
      categories,
      genres,
      languages,
      gender,
      existingAttachments,
      deletedAttachments,
      status,
    } = req.body;

    // Parse location
    let parsedLocation = job.location;
    if (location && location.trim() !== '') {
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
    }

    // Parse arrays
    const categoriesArray = categories && categories.trim() !== ''
      ? categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : job.categories;

    const genresArray = genres && genres.trim() !== ''
      ? genres.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : job.genres;

    const languagesArray = languages && languages.trim() !== ''
      ? languages.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : job.languages;

    const genderArray = gender && gender.trim() !== ''
      ? gender.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      : job.gender;

    // Validate arrays if provided
    if (req.body.categories && categoriesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid category must be selected',
      });
    }
    if (req.body.genres && genresArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid genre must be selected',
      });
    }
    if (req.body.languages && languagesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid language must be selected',
      });
    }
    if (req.body.gender && genderArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid gender must be selected',
      });
    }

    // Validate price
    let numericPrice = job.price;
    if (price && price.trim() !== '') {
      numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number',
        });
      }
    }

    // Validate state
    let stateIndex = job.state;
    if (state && state.trim() !== '') {
      stateIndex = parseInt(state);
      if (isNaN(stateIndex) || stateIndex < 1 || stateIndex > 50) {
        return res.status(400).json({
          success: false,
          message: 'Invalid state selection',
        });
      }
    }

    // Parse range
    let rangeValue = job.range;
    if (range && range.trim() !== '') {
      const rangeMatch = range.match(/\d+/);
      rangeValue = rangeMatch ? parseInt(rangeMatch[0]) : null;
    }

    // Validate date and time
    let jobDate = job.date;
    let jobTime = job.time;
    if (date && date.trim() !== '') {
      try {
        jobDate = new Date(date);
        if (isNaN(jobDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format',
        });
      }
    }
    if (time && time.trim() !== '') {
      try {
        jobTime = new Date(time);
        if (isNaN(jobTime.getTime())) {
          throw new Error('Invalid time format');
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format',
        });
      }
    }

    // Parse existing attachments
      let existingAttachmentsArray = job.attachments; // Default to current attachments
      if (existingAttachments && existingAttachments.trim() !== '') {
        try {
          existingAttachmentsArray = JSON.parse(existingAttachments);
          if (!Array.isArray(existingAttachmentsArray)) {
            throw new Error('Existing attachments must be an array');
          }
          console.log('Parsed existingAttachments:', existingAttachmentsArray);
        } catch (error) {
          console.error('Existing attachments parsing error:', error);
          return res.status(400).json({
            success: false,
            message: 'Invalid existing attachments format',
          });
        }
      } else {
        console.log('No existingAttachments provided, using job.attachments:', job.attachments);
      }

    // Parse deleted attachments
      let deletedAttachmentsArray = [];
      if (deletedAttachments && deletedAttachments.trim() !== '') {
        try {
          deletedAttachmentsArray = JSON.parse(deletedAttachments);
          if (!Array.isArray(deletedAttachmentsArray)) {
            throw new Error('Deleted attachments must be an array');
          }
          console.log('Parsed deletedAttachments:', deletedAttachmentsArray);
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
          url: `/Uploads/${file.filename}`,
          type: file.mimetype,
          size: file.size,
        }))
      : [];
      console.log('New attachments:', newAttachments);

    // Determine final attachments
    // Compute final attachments
    const finalAttachments = [
      ...existingAttachmentsArray.filter(
        att => !deletedAttachmentsArray.includes(att.url)
      ),
      ...newAttachments,
    ];
    console.log('Final attachments computed:', finalAttachments);

    // Delete physical files for deleted attachments
    const fs = require('fs').promises;
    const path = require('path');
    for (const url of deletedAttachmentsArray) {
      if (url.startsWith('/Uploads/')) {
        const filePath = path.join(__dirname, '../', url);
        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
          console.log(`Successfully deleted file: ${filePath}`);
        } catch (error) {
          console.log(`File not found or already deleted: ${filePath}`);
        }
      }
    }

    // Validate status
    const validStatuses = ['active', 'paused', 'closed', 'draft'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

      // Update job with only provided fields
      const updateData = {
        ...(title && { title }),
        ...(description && { description }),
        ...(duration && { duration }),
        ...(price && { price: numericPrice }),
        ...(typeof isNegotiable !== 'undefined' && { isNegotiable: isNegotiable === 'true' }),
        ...(date && { date: jobDate }),
        ...(time && { time: jobTime }),
        ...(state && { state: stateIndex }),
        ...(city && { city }),
        ...(zipCode && { zipCode }),
        ...(location && {
          location: {
            name: parsedLocation.name,
            address: parsedLocation.address,
            coordinates: {
              type: 'Point',
              coordinates: parsedLocation.coordinates,
            },
          },
        }),
        ...(range && { range: rangeValue }),
        ...(categories && { categories: categoriesArray }),
        ...(genres && { genres: genresArray }),
        ...(languages && { languages: languagesArray }),
        ...(gender && { gender: genderArray }),
        ...((existingAttachments || deletedAttachmentsArray.length > 0 || newAttachments.length > 0) && {
          attachments: finalAttachments,
        }),
        ...(status && { status }),
        updatedAt: new Date(),
      };

    // Update job
    const updatedJob = await JobPost.findByIdAndUpdate(
      jobId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update job',
      });
    }

    console.log('Job updated successfully:', updatedJob._id);
    console.log('Final attachments:', finalAttachments);

    res.status(200).json({
      success: true,
      jobId: updatedJob._id,
      message: 'Job updated successfully',
    });
  } catch (error) {
    console.error('Error updating job:', error);
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
      message: 'Failed to update job. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// Delete job (for drafts and closed jobs)
exports.deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format',
      });
    }

    // Check if job exists and belongs to the buyer
    const job = await JobPost.findOne({ _id: jobId, buyerId: req.user.userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to delete it',
      });
    }

    // Only allow deletion of drafts or closed jobs
    if (job.status !== 'draft' && job.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Only draft or closed jobs can be deleted',
      });
    }

    // Delete job
    await JobPost.deleteOne({ _id: jobId });

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting job',
      error: error.message,
    });
  }
};


// jobsController.js
// ... existing imports and controllers (post, saveDraft, getById, getMyJobs, updateJob, deleteJob) ...

// Update job status (for Pause, Close, Repost, Publish)
exports.updateJobStatus = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { status } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format',
      });
    }

    // Validate status
    const validStatuses = ['active', 'paused', 'closed', 'draft'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    // Check if job exists and belongs to the buyer
    const job = await JobPost.findOne({ _id: jobId, buyerId: req.user.userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update it',
      });
    }

    // Update status
    job.status = status;
    const updatedJob = await job.save();

    res.status(200).json({
      success: true,
      message: `Job ${status} successfully`,
      data: { id: updatedJob._id, status: updatedJob.status },
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating job status',
      error: error.message,
    });
  }
};







// Get latest 6 jobs (public, no login required)
exports.getLatestJobsWebsite = async (req, res) => {
  try {
    // Build query (only fetch active jobs, optional)
    const query = { status: "active" };

    // Fetch only 6 recent jobs
    const jobs = await JobPost.find(query)
      .sort({ createdAt: -1 })
      .limit(6);

    // Fetch categories for mapping
    const categories = await Category.find();
    const subcategoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach((sub) => {
        acc[sub.subcategory_id] = { name: sub.name, category: cat.name };
      });
      return acc;
    }, {});

    // Constants (same as frontend mapping)
    const genresOptions = ["Jazz", "Country", "Gospel", "Christian", "RnB", "Pop", "Blues", "Funk"];
    const languageOptions = ["English", "French", "Spanish", "Hindi", "Urdu"];
    const genderOptions = ["Male", "Female", "Other"];

    // Format job data
    const jobData = jobs.map((job) => ({
      id: job._id,
      buyerId: job.buyerId,
      title: job.title,
      description: job.description,
      duration: job.duration,
      price: job.price,
      isNegotiable: job.isNegotiable,
      date: job.date,
      time: job.time,
      state: job.state,
      city: job.city,
      zipCode: job.zipCode,
      location: {
        name: job.location?.name || "",
        address: job.location?.address || "",
        coordinates: job.location?.coordinates?.coordinates || [],
      },
      range: job.range,
      categories: job.categories.map((id) => ({
        subcategory_id: id,
        name: subcategoryMap[id]?.name || "Unknown",
        category: subcategoryMap[id]?.category || "Unknown",
      })),
      genres: job.genres.map((index) => ({
        id: index,
        name: genresOptions[index - 1] || "Unknown",
      })),
      languages: job.languages.map((index) => ({
        id: index,
        name: languageOptions[index - 1] || "Unknown",
      })),
      gender: job.gender.map((index) => ({
        id: index,
        name: genderOptions[index - 1] || "Unknown",
      })),
      attachments: job.attachments,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: jobData,
    });
  } catch (error) {
    console.error("Error fetching latest jobs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching latest jobs",
      error: error.message,
    });
  }
};


// Update exports
// module.exports = {
//   post: exports.post,
//   saveDraft: exports.saveDraft,
//   getById: exports.getById,
//   getMyJobs: exports.getMyJobs,
//   updateJob: exports.updateJob,
//   deleteJob: exports.deleteJob,
//   updateJobStatus: exports.updateJobStatus, // Add this
// };https://grok.com/history?tab=conversations