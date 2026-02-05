const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const applicationSchema = new Schema({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  coverLetter: {
    type: [String],
    required: true
  },
  conclusion: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  services: {
    type: [String],
    required: true
  },
  genres: {
    type: [String],
    required: true
  },
  languages: {
    type: [String],
    required: true
  },
  location: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  attachments: [{
    name: {
      type: String,
      required: true
    },
    uri: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['Submitted', 'Accepted', 'Rejected'],
    default: 'Submitted'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);