// models/Media.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  seller_id: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

mediaSchema.index({ seller_id: 1, type: 1 });

module.exports = mongoose.model('Media', mediaSchema);