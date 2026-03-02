const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const JobPost = require('../models/Job');
const { validationResult } = require('express-validator');
const { getGenreIdByName, getGenreNameById, getLanguageIdByName, getLanguageNameById, getCategoryNameById } = require('../utils/constants');
const fs = require('fs').promises;
const path = require('path');

// Submit a new proposal
exports.submitProposal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const { jobId, price, coverLetter, categories, genres, languages } = req.body;
    const sellerId = req.user.userId; 

    // Check for existing proposal
    const existingProposal = await Proposal.findOne({ jobId, sellerId });
    if (existingProposal) {
      return res.status(400).json({ success: false, message: 'You have already submitted a proposal for this job' });
    }

    // Validate job exists and is active
    const job = await JobPost.findById(jobId);
    if (!job || job.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Job not found or not active' });
    }

    // Parse arrays
    const categoriesArray = categories ? categories.split(',') : [];
    const genresArray = genres ? genres.split(',') : [];
    const languagesArray = languages ? languages.split(',') : [];

    // Process attachments
    const newAttachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/Uploads/${file.filename}`,
      type: file.mimetype,
      size: file.size,
    })) : [];

    // Create proposal
    const proposal = new Proposal({
      jobId,
      sellerId,
      offerPrice: parseFloat(price),
      coverLetter: coverLetter || '',
      categories: categoriesArray,
      genres: genresArray,
      languages: languagesArray,
      attachments: newAttachments,
      status: 'submitted',
    });

    const savedProposal = await proposal.save();
    console.log('Proposal submitted:', savedProposal._id);

    res.status(201).json({ success: true, proposalId: savedProposal._id, message: 'Proposal submitted successfully' });
  } catch (error) {
    console.error('Error submitting proposal:', error);
    res.status(500).json({ success: false, message: 'Failed to submit proposal', error: error.message });
  }
};
// Update an existing proposal
// Update an existing proposal
exports.updateProposal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const proposalId = req.params.id;
    const sellerId = req.user && req.user.userId || req.body.sellerId; // Allow sellerId from body for testing purposes
    const { price, coverLetter, categories, genres, languages, existingAttachments, deletedAttachments, buyerDecision } = req.body;

    // Validate proposal exists and belongs to seller
    const proposal = await Proposal.findOne({ _id: proposalId, sellerId }).populate('jobId', 'title description price');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found or you do not have permission to update it' });
    }

    // Only allow updates if status is submitted
    if (proposal.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Can only edit proposals in submitted status' });
    }

    // Parse arrays
    const categoriesArray = categories ? categories.split(',') : proposal.categories;
    const genresArray = genres ? genres.split(',') : proposal.genres;
    const languagesArray = languages ? languages.split(',') : proposal.languages;

    // Parse existing and deleted attachments
    let existingAttachmentsArray = proposal.attachments;
    if (existingAttachments && existingAttachments.trim() !== '') {
      try {
        existingAttachmentsArray = JSON.parse(existingAttachments);
        if (!Array.isArray(existingAttachmentsArray)) {
          throw new Error('Existing attachments must be an array');
        }
        // Transform existingAttachments to match schema
        existingAttachmentsArray = existingAttachmentsArray.map(att => ({
          name: att.name,
          url: att.url,
          type: att.type,
          size: typeof att.size === 'string' && att.size.includes('mb')
            ? parseFloat(att.size.replace('mb', '')) * 1000000 // Convert MB to bytes
            : att.size, // Assume number if not string with 'mb'
        }));
      } catch (error) {
        console.error('Existing attachments parsing error:', error);
        return res.status(400).json({ success: false, message: 'Invalid existing attachments format' });
      }
    }

    let deletedAttachmentsArray = [];
    if (deletedAttachments && deletedAttachments.trim() !== '') {
      try {
        deletedAttachmentsArray = JSON.parse(deletedAttachments);
        if (!Array.isArray(deletedAttachmentsArray)) {
          throw new Error('Deleted attachments must be an array');
        }
      } catch (error) {
        console.error('Deleted attachments parsing error:', error);
        return res.status(400).json({ success: false, message: 'Invalid deleted attachments format' });
      }
    }

    // Process new attachments
    const newAttachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/Uploads/${file.filename}`,
      type: file.mimetype,
      size: file.size, // Already a number in bytes
    })) : [];

    // Compute final attachments
    const finalAttachments = [
      ...existingAttachmentsArray.filter(att => !deletedAttachmentsArray.includes(att.url)),
      ...newAttachments,
    ];

    // Delete physical files for deleted attachments
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

    // Update proposal
    const updateData = {
      ...(buyerDecision ? { buyerDecision: buyerDecision } : {buyerDecision: null}),
      ...(price && { offerPrice: parseFloat(price) }),
      ...(coverLetter && { coverLetter }),
      ...(categories && { categories: categoriesArray }),
      ...(genres && { genres: genresArray }),
      ...(languages && { languages: languagesArray }),
      ...((existingAttachments || deletedAttachmentsArray.length > 0 || newAttachments.length > 0) && { attachments: finalAttachments }),
      updatedAt: new Date(),
    };

    const updatedProposal = await Proposal.findByIdAndUpdate(proposalId, updateData, { new: true, runValidators: true }).populate('jobId', 'title description price');
    console.log('Proposal updated:', updatedProposal._id);

    // Format response to match getProposal
    const proposalData = {
      id: updatedProposal._id,
      jobId: updatedProposal.jobId._id,
      jobTitle: updatedProposal.jobId.title,
      jobDescription: updatedProposal.jobId.description,
      jobPrice: updatedProposal.jobId.price,
      offerPrice: updatedProposal.offerPrice,
      coverLetter: updatedProposal.coverLetter,
      categories: updatedProposal.categories.map(id => ({
        id,
        name: id, // Frontend handles mapping
      })),
      genres: updatedProposal.genres.map(id => ({
        id,
        name: getGenreNameById(id) || 'Unknown',
      })),
      languages: updatedProposal.languages.map(id => ({
        id,
        name: getLanguageNameById(id) || 'Unknown',
      })),
      attachments: updatedProposal.attachments,
      status: updatedProposal.status,
      createdAt: updatedProposal.createdAt,
      updatedAt: updatedProposal.updatedAt,
    };

    res.status(200).json({ success: true, proposalId: updatedProposal._id, data: proposalData, message: 'Proposal updated successfully' });
  } catch (error) {
    console.error('Error updating proposal:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(error.errors).map(err => err.message) });
    }
    res.status(500).json({ success: false, message: 'Failed to update proposal', error: error.message });
  }
};

// Get proposal details for seller
exports.getProposal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const proposalId = req.params.id;
    const sellerId = req.user.userId;

    const proposal = await Proposal.findOne({ _id: proposalId, sellerId })
      .populate('jobId', 'title description price');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const proposalData = {
      id: proposal._id,
      jobId: proposal.jobId._id,
      jobTitle: proposal.jobId.title,
      jobDescription: proposal.jobId.description,
      jobPrice: proposal.jobId.price,
      offerPrice: proposal.offerPrice,
      coverLetter: proposal.coverLetter,
      categories: proposal.categories.map(id => ({
        id,
        name: id, // Frontend handles mapping
      })),
      genres: proposal.genres.map(id => ({
        id,
        name: getGenreNameById(id) || 'Unknown',
      })),
      languages: proposal.languages.map(id => ({
        id,
        name: getLanguageNameById(id) || 'Unknown',
      })),
      attachments: proposal.attachments,
      status: proposal.status,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };

    res.status(200).json({ success: true, data: proposalData });
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch proposal', error: error.message });
  }
};

// Get proposals for a job (buyer view)
exports.getProposalsForJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const jobId = req.params.jobId;
    const buyerId = req.user.userId;

    // Validate job belongs to buyer
    const job = await JobPost.findOne({ _id: jobId, buyerId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found or you do not have permission' });
    }

    const proposals = await Proposal.find({ jobId }).populate('sellerId', 'username email');
    const proposalData = proposals.map(proposal => ({
      id: proposal._id,
      buyerDecision: proposal.buyerDecision,
      sellerId: proposal.sellerId._id,
      sellerName: proposal.sellerId.username,
      sellerEmail: proposal.sellerId.email,
      offerPrice: proposal.offerPrice,
      coverLetter: proposal.coverLetter,
      categories: proposal.categories.map(id => ({
        id,
        name: getCategoryNameById(id) || 'Unknown', // Frontend handles mapping
      })),
      genres: proposal.genres.map(id => ({
        id,
        name: getGenreNameById(id) || 'Unknown',
      })),
      languages: proposal.languages.map(id => ({
        id,
        name: getLanguageNameById(id) || 'Unknown',
      })),
      attachments: proposal.attachments,
      status: proposal.status,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    }));

    res.status(200).json({ success: true, data: proposalData });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch proposals', error: error.message });
  }
};

// Accept or reject proposal (buyer action)
exports.updateProposalStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const proposalId = req.params.id;
    const { status } = req.body;
    const buyerId = req.user.userId;

    // Validate proposal exists and job belongs to buyer
    const proposal = await Proposal.findById(proposalId).populate('jobId');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.jobId.buyerId.toString() !== buyerId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this proposal' });
    }

    // Update status
    proposal.status = status;
    const updatedProposal = await proposal.save();

    // Update job status if accepting a proposal
    if (status === 'active') {
      await JobPost.findByIdAndUpdate(proposal.jobId, { status: 'closed' });
    }

    res.status(200).json({
      success: true,
      message: `Proposal ${status} successfully`,
      data: { id: updatedProposal._id, status: updatedProposal.status },
    });
  } catch (error) {
    console.error('Error updating proposal status:', error);
    res.status(500).json({ success: false, message: 'Failed to update proposal status', error: error.message });
  }
};

// Delete (withdraw) a proposal
exports.deleteProposal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const proposalId = req.params.id;
    const sellerId = req.user.userId;

    const proposal = await Proposal.findOne({ _id: proposalId, sellerId });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found or you do not have permission to delete it' });
    }

    if (proposal.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Can only withdraw proposals in submitted status' });
    }

    for (const attachment of proposal.attachments) {
      if (attachment.url.startsWith('/Uploads/')) {
        const filePath = path.join(__dirname, '../', attachment.url);
        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
          console.log(`Successfully deleted file: ${filePath}`);
        } catch (error) {
          console.log(`File not found or already deleted: ${filePath}`);
        }
      }
    }

    await Proposal.findByIdAndDelete(proposalId);
    console.log('Proposal deleted:', proposalId);

    res.status(200).json({ success: true, message: 'Proposal withdrawn successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ success: false, message: 'Failed to withdraw proposal', error: error.message });
  }
};

// Add new function for seller proposal status
exports.getProposalStatusForJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => e.msg) });
    }

    const jobId = req.params.jobId;
    const sellerId = req.user.userId;

    // Validate job exists
    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Fetch seller's proposal
    const proposal = await Proposal.findOne({ jobId, sellerId });
    if (!proposal) {
      return res.status(200).json({ success: true, data: { status: null } });
    }

    res.status(200).json({ success: true, data: { status: proposal.status, id: proposal._id } });
  } catch (error) {
    console.error('Error fetching proposal status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch proposal status', error: error.message });
  }
};

// Update exports
module.exports = {
  submitProposal: exports.submitProposal,
  updateProposal: exports.updateProposal,
  getProposal: exports.getProposal,
  getProposalsForJob: exports.getProposalsForJob,
  updateProposalStatus: exports.updateProposalStatus,
  deleteProposal: exports.deleteProposal,
  getProposalStatusForJob: exports.getProposalStatusForJob,
};