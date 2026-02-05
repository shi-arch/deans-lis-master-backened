const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true, maxlength: 250 },
  duration: { type: String, enum: ['1 Week', '2 Weeks', '1 Month', '3 Months', '6 Months', '1 Year'], required: true },
  price: { type: Number, required: true },
  isNegotiable: { type: Boolean, default: false },
  date: { type: Date, required: true },
  time: { type: Date, required: true },
  state: { type: Number, required: true }, // Store state index
  city: { type: String, required: true },
  zipCode: { type: String, required: true },
  location: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  range: { type: Number }, // Store range value (e.g., 50, 100)
  categories: [{
    category_id: { type: Number, required: true }, // Store main category_id
    subcategory_id: { type: Number, required: true }, // Store subcategory_id
  }],
  genres: [{ type: Number }], // Store genre indices
  languages: [{ type: Number }], // Store language indices
  gender: [{ type: Number }], // Store gender indices
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('JobPost', jobPostSchema);