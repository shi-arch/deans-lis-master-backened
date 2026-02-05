const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  filter: {
    type: String,
    required: true
  },
  totalSpent: {
    type: Number,
    required: true
  },
  totalOrders: {
    type: Number,
    required: true
  },
  expenses: [{
    type: Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  }],
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);