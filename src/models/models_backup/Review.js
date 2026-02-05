const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  _id: Schema.Types.ObjectId,
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
  buyerId: { type: Schema.Types.ObjectId, ref: 'Buyer', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  location: { type: String, required: true },
  date: { type: String, required: true },
  services: { type: String, required: true },
  text: { type: String, required: true, maxlength: 250 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Review', ReviewSchema);