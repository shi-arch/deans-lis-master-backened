const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Buyer', 'Seller']
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'receiverModel'
  },
  receiverModel: {
    type: String,
    required: true,
    enum: ['Buyer', 'Seller']
  },
  text: {
    type: String
  },
  attachments: [{
    name: {
      type: String
    },
    uri: {
      type: String
    },
    type: {
      type: String
    },
    size: {
      type: Number
    }
  }],
  type: {
    type: String,
    enum: ['Text', 'HireRequest'],
    default: 'Text'
  }
}, {
  timestamps: true
});

messageSchema.index({ orderId: 1, createdAt: 1, senderId: 1, receiverId: 1 });

module.exports = mongoose.model('Message', messageSchema);