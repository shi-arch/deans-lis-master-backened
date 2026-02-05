const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SkillSchema = new Schema({
  _id: Schema.Types.ObjectId,
  sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
  title: { type: String, required: true },
  points: { type: [String], required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Skill', SkillSchema);