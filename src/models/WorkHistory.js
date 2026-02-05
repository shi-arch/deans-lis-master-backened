const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorkHistorySchema = new Schema({
  _id: Schema.Types.ObjectId,
  sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
  location: { type: String, required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
  date: { type: String, required: true },
  services: { type: String, required: true },
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkHistory', WorkHistorySchema);