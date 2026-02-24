const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  jobId: {
    // type: Schema.Types.ObjectId,
    // ref: 'Job',
    // //required: true
    type: String
  },
  applicationId: {
    // type: Schema.Types.ObjectId,
    // ref: 'Application',
    // //required: true
    type: String
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  payment: {
    amount: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Escrow', 'Released', 'Refunded'],
      default: 'Pending'
    },
    escrowedAt: {
      type: Date
    },
    releasedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    }
  },
  schedule: {
    date: {
      type: Date,
      required: true
    },
    time: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  status: {
    type: String,
    enum: ['Pending', 'Delivered', 'Rejected', 'Complete', 'Cancelled'],
    default: 'Pending'
  },
  completionRequest: {
    requestedAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    }
  },
  timeRemaining: {
    type: String
  }
}, {
  timestamps: true
});

orderSchema.index({ orderId: 1, buyerId: 1, sellerId: 1 });

module.exports = mongoose.model('Order', orderSchema);