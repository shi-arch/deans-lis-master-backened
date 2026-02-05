const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  reference: {
    type: String,
    enum: ['Buyer', 'Seller'],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'reference',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'loginType',
  },
  loginType: {
    type: String,
    enum: ['Buyer', 'Seller'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);