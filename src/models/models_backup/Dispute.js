const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const disputeSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNo: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 250
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
      type: Number,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dispute', disputeSchema);