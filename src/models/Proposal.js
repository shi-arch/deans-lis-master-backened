const mongoose = require('mongoose');

// Ensure no cached model conflicts
delete mongoose.models.Proposal;

const proposalSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: [true, 'Job ID is required'],
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller', // Changed to 'User' assuming a single User model
    required: [true, 'Seller ID is required'],
  },
  offerPrice: {
    type: Number,
    required: [true, 'Offer price is required'],
    min: [0, 'Offer price must be positive'],
    default: 0,
  },
  coverLetter: {
    type: String,
    default: '',
    trim: true,
    maxlength: [1000, 'Cover letter cannot exceed 1000 characters'],
  },
  categories: {
    type: [Number],
    default: [],
    // validate: {
    //   validator: function (v) {
    //     return v.length > 0;
    //   },
    //   message: 'At least one category is required',
    // },
  },
  languages: {
    type: [Number],
    default: [],
  },
  genres: {
    type: [Number],
    default: [],
  },
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String },
    size: { type: Number },
  }],
  status: {
    type: String,
    enum: {
      values: ['submitted', 'active', 'rejected', 'archived'],
      message: '{VALUE} is not a valid status',
    },
    default: 'submitted',
    required: [true, 'Status is required'],
  },
  buyerDecision: {
    type: String,
    enum: {
      values: ['shortlisted', 'maybe', 'no-interest'],
      message: '{VALUE} is not a valid decision',
    }
  }
}, {
  timestamps: true,
});

// Prevent multiple proposals from the same seller for the same job
proposalSchema.index({ jobId: 1, sellerId: 1 }, { unique: true });

// Export the model
module.exports = mongoose.model('Proposal', proposalSchema);