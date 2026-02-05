const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CertificateSchema = new Schema({
  _id: Schema.Types.ObjectId,
  sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  institution: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Certificate', CertificateSchema);