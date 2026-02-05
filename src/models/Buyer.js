// // models/User.js
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema(
//   {
//     firstName: { type: String, required: true, minlength: 2 },
//     lastName: { type: String, minlength: 2, default: '' },
//     username: { type: String, required: true, minlength: 3, unique: true },
//     emailOrPhone: { type: String, required: true, unique: true },
//     city: { type: String, minlength: 2, default: 'Unknown' },
//     zipCode: { type: String, match: /^\d{5,6}$/, default: '00000' },
//     password: { type: String, minlength: 8 },
//     agreedToTerms: { type: Boolean, required: true },
//     googleId: { type: String, unique: true, sparse: true },
//     isTalent: { type: Boolean, default: false },
//     gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
//     createdAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('User', userSchema);


const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, minlength: 2 },
    lastName: { type: String, minlength: 2, default: '' },
    username: { type: String, required: true, minlength: 3, unique: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
    },
    phoneNumber: { 
      type: String, 
      unique: true, 
      match: /^\+?[1-9]\d{1,14}$/, 
      sparse: true 
    },
    city: { type: String, required: true, minlength: 2 },
    zipCode: { type: String, required: true, match: /^\d{5,6}$/ },
    password: { type: String, required: true, minlength: 8 },
    agreedToTerms: { type: Boolean, required: true },
    otp: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
    savedTalents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seller' }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Buyer', userSchema);