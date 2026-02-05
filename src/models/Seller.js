const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {
  LANGUAGES,
  GENRES,
  GENDERS,
  BADGES,
  BADGE_LABELS,
  BADGE_COLORS,
} = require('../utils/constants');

// Certificate subdocument schema
const CertificateSchema = new Schema(
  {
    name: { type: String, required: true },
    date: { type: String, required: true },
    institution: { type: String, required: true },
  },
  { _id: false }
);

// Education subdocument schema
const EducationSchema = new Schema(
  {
    degree: { type: String, required: true },
    date: { type: String, required: true },
    institution: { type: String, required: true },
  },
  { _id: false }
);

const PortfolioSchema = new Schema(
  {
    url: { type: String, required: true }, // File URL
    title: { type: String, required: true }, // e.g., "Video Title"
    location: { type: String }, // e.g., "San Francisco, CA"
    type: { type: String, enum: ["video", "audio"], required: true }, // Media type
  },
  { _id: false }
);

// Story subdocument schema
const StorySchema = new Schema(
  {
    url: { type: String, required: true }, // URL or file_key for video/image
    type: { type: String, enum: ["video", "image"], required: true }, // Story type
    created_at: { type: Date, default: Date.now }, // Timestamp
  },
  { _id: false }
);

const SellerSchema = new Schema(
  {
    // _id: Schema.Types.ObjectId,
    first_name: { type: String, required: true, minlength: 2 },
    last_name: { type: String, minlength: 2, default: "" },
    username: { type: String, required: true, minlength: 3, unique: true },
    email: { type: String, unique: true, sparse: true }, // Allow null
    phone: { type: String, unique: true, sparse: true }, // Allow null
    city: { type: String, minlength: 2, default: "Unknown" },
    zip_code: { type: String, match: /^\d{5,6}$/, default: "00000" },
    password: { type: String, required: true, minlength: 8 },
    agreed_to_terms: { type: Boolean, required: true },
    google_id: { type: String, unique: true, sparse: true },
    state: {
      type: Number,
      enum: BADGES.map(badge => badge.id),
      
    },
    price_range: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },

    badge: {
      type: Number,
      enum: BADGES.map(badge => badge.id),
      default: 1,
    },
    availability: [{ type: Date }],
    description: { type: String },
    long_description: { type: String,
      maxlength: [10000, 'Long description cannot exceed 10,000 characters'], // Prevent overly large input
      default: '', // Optional: provide a default empty string
     },
    genres: {
      type: [Number],
      enum: GENRES.map((genre) => genre.id),
      default: [],
    },
    gender: {
      type: [Number],
      enum: GENDERS.map((gender) => gender.id),
      default: [],
    },
    // services: {
    //   type: [Number],
    //   enum: [SERVICE_SINGER,SERVICE_MUSICIAN,SERVICE_GUITARIST,SERVICE_POP,SERVICE_ROCK,SERVICE_HIP_HOP,SERVICE_ELECTRONIC,SERVICE_CLASSICAL],
    //   required: true
    // },
    services: {
      type: [Number], // Stores numeric ids from Category (e.g., [2, 3] for "Guitar" and "Acoustic Guitar")
      required: true,
    },
    languages: {
      type: [Number],
      enum: LANGUAGES.map((lang) => lang.id),
      default: [],
    },
    image: { type: String }, // file_key from File collection
    portfolio: [PortfolioSchema],
    // Store certificates and education as arrays of objects
    certificates: [CertificateSchema],
    education: [EducationSchema],
    stories: [StorySchema],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Seller", SellerSchema);
