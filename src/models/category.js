const mongoose = require('mongoose');
  const Schema = mongoose.Schema;

  const SubCategorySchema = new Schema({
    subcategory_id: { type: Number, required: true, unique: true }, // Numeric ID for each subcategory
    name: { type: String, required: true }, // e.g., "Guitar", "Violin"
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  }, { _id: false, timestamps: true });

  const CategorySchema = new Schema({
    //_id: Schema.Types.ObjectId,
    category_id: { type: Number, required: true, unique: true }, // Numeric ID for main category
    name: { type: String, required: true, unique: true }, // e.g., "String"
    subcategories: [SubCategorySchema], // Array of subcategory objects
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  }, {
    timestamps: true
  });

  module.exports = mongoose.model('Category', CategorySchema, 'Category'); // Explicit collection name