const mongoose = require('mongoose');

// Ensure no cached model conflicts
delete mongoose.models.JobPost;

const jobPostSchema = new mongoose.Schema({
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Buyer', 
    required: [true, 'Buyer ID is required']
  },
  title: { 
    type: String, 
    required: [true, 'Job title is required'],
    trim: true 
  },
  description: { 
    type: String, 
    default: '',
    trim: true,
    maxlength: [250, 'Description cannot exceed 250 characters']
  },
  duration: { 
    type: String, 
    enum: {
      values: ['1 Week', '2 Weeks', '1 Month', '3 Months', '6 Months', '1 Year'],
      message: '{VALUE} is not a valid duration'
    },
    default: '1 Month'
  },
  price: { 
    type: Number, 
    default: 0,
    min: [0, 'Price must be positive']
  },
  isNegotiable: { 
    type: Boolean, 
    default: false 
  },
  date: { 
    type: Date, 
    default: Date.now
  },
  time: { 
    type: Date, 
    default: Date.now
  },
  state: { 
    type: Number, 
    default: 1,
    min: [1, 'Invalid state'],
    max: [50, 'Invalid state']
  },
  city: { 
    type: String, 
    default: '',
    trim: true
  },
  zipCode: { 
    type: String, 
    default: '',
    trim: true
  },
  location: {
    name: { 
      type: String, 
      default: 'TBD'
    },
    address: { 
      type: String, 
      default: 'TBD'
    },
    coordinates: {
      type: { 
        type: String, 
        enum: ['Point'], 
        default: 'Point'
      },
      coordinates: { 
        type: [Number], 
        default: [0, 0],
        validate: {
          validator: function(coords) {
            return Array.isArray(coords) && coords.length === 2;
          },
          message: 'Coordinates must be an array of [longitude, latitude]'
        }
      }
    }
  },
  range: { 
    type: Number,
    default: null,
    min: [1, 'Range must be positive']
  },
  categories: {
    type: [Number],
    default: []
  },
  genres: {
    type: [Number],
    default: []
  },
  languages: {
    type: [Number],
    default: []
  },
  gender: {
    type: [Number],
    default: []
  },
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String },
    size: { type: Number }
  }],
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