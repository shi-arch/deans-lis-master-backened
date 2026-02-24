const mongoose = require('mongoose');

// Ensure no cached model conflicts
delete mongoose.models.JobPost;

const jobPostSchema = new mongoose.Schema({
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Buyer', 
    required: [true, 'Buyer ID is required']
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seller', 
    required: [true, 'Seller ID is required']
  },
  transactionId: { 
    type: String, 
    required: [true, 'Transaction ID is required'],
    unique: true
  },
  orderId: { 
    type: String, 
    required: [true, 'Order ID is required'],
    unique: true
  },  
  status: { 
    type: String, 
    enum: {
      values: ['active', 'paused', 'closed', 'draft'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft', 
    required: [true, 'Status is required']
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
jobPostSchema.index({ 'location.coordinates': '2dsphere' });

// Export the model
module.exports = mongoose.model('JobPost', jobPostSchema);