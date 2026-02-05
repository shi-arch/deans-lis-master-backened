const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileSchema = new Schema({
  _id: Schema.Types.ObjectId,
  file_key: { type: String, required: true },
  file_name: { type: String, required: true },
  file_data: { type: String },
  file_path: { type: String, required: true }, 
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('File', FileSchema);