const { OAuth2Client } = require('google-auth-library');
const Buyer = require('../models/Buyer');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { createLog } = require('../services/logging');
const { Seller, Media, Review, Order } = require('../models');
const { BADGE_LABELS, BADGE_COLORS, LANGUAGE_LABELS } = require('../utils/constants');
const { sendEmail } = require('./emailTemplate');
const upload = require('../middleware/multer');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.signup = [ async (req, res) => {
  try {
    let { firstName, lastName, username, email, phoneNumber, city, zipCode, password, confirmPassword, agreedToTerms, rememberMe } = req.body;
    console.log('Received signup data:', { firstName, lastName, username, email, phoneNumber, city, zipCode, agreedToTerms, rememberMe });

    // Sanitize inputs
    firstName = validator.trim(firstName || '');
    lastName = validator.trim(lastName || '');
    username = validator.trim(username || '');
    email = validator.trim(email || '');
    phoneNumber = validator.trim(phoneNumber || '');
    city = validator.trim(city || '');
    zipCode = validator.trim(zipCode || '');
    password = validator.trim(password || '');
    confirmPassword = validator.trim(confirmPassword || '');

    // Escape HTML to prevent XSS
    firstName = validator.escape(firstName);
    lastName = validator.escape(lastName);
    username = validator.escape(username);
    email = validator.escape(email);
    phoneNumber = validator.escape(phoneNumber);
    city = validator.escape(city);
    zipCode = validator.escape(zipCode);

    // 1. Check required fields
    if (!firstName || !username || !email || !city || !zipCode || !password || !confirmPassword || agreedToTerms === undefined) {
      console.log('Missing required fields:', { firstName, username, email, city, zipCode, password, confirmPassword, agreedToTerms });
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // 2. Validate First Name
    if (firstName.length < 2) {
      return res.status(400).json({ message: 'First Name must be at least 2 characters.' });
    }


    // 3. Validate Last Name (optional)
    if (lastName && lastName.length < 2) {
      return res.status(400).json({ message: 'Last Name must be at least 2 characters.' });
    }

    // 4. Validate Buyername
    if (username.length < 3) {
      return res.status(400).json({ message: 'Buyername must be at least 3 characters.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: 'Buyername can only contain letters, numbers, and underscores.' });
    }

    // 5. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    // 6. Validate Phone Number (optional)
    if (phoneNumber && !/^\d{10}$|^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Enter a valid phone number (e.g., 9632612163 or +919632612163).' });
    }

    // 7. Validate City
    if (city.length < 2) {
      return res.status(400).json({ message: 'City must be at least 2 characters.' });
    }

    // 8. Validate Zip Code
    const zipRegex = /^\d{5,6}$/;
    if (!zipRegex.test(zipCode)) {
      return res.status(400).json({ message: 'Zip Code must be 5 or 6 digits.' });
    }

    // 9. Validate Password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    // 10. Validate Confirm Password
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // 11. Validate Agreed to Terms
    if (!agreedToTerms) {
      return res.status(400).json({ message: 'You must agree to the Terms of Service.' });
    }
     


    // 12. Check for existing user
    console.log('Checking for existing user:', { username, email, phoneNumber });
    const existingBuyer = await Buyer.findOne({ $or: [{ username }, { email }, { phoneNumber: phoneNumber || null }] });
    if (existingBuyer) {
      console.log('Duplicate user found:', { username: existingBuyer.username, email: existingBuyer.email, phoneNumber: existingBuyer.phoneNumber });
      return res.status(400).json({ message: 'Buyername, email, or phone number already exists.' });
    }

    // 13. Hash the password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = await sendEmail(firstName + ' ' + lastName, email);
    console.log('OTP sent via email:', otp);
    // 14. Create and save the new user
    console.log('Creating new user...');
    const user = new Buyer({
      firstName,
      lastName: lastName || '',
      username,
      email,
      phoneNumber: phoneNumber || undefined,
      city,
      zipCode,
      password: hashedPassword,
      agreedToTerms,
      otp
    });
    await user.save();
    console.log('Buyer saved successfully:', { userId: user._id });

    // 15. Set logging data
      // req.user = user._id;

    await createLog('Buyer', user._id, user._id, 'Buyer', 'Signup completed successfully');
    await createLog('Buyer', user._id, user._id, 'Buyer', user);

    // 16. Generate JWT with expiration based on rememberMe
    res.status(201).json({
      success: true,
      message: 'Buyer created successfully and email sent succcessfully.',
      user: { email: user.email, username: user.username, otp },
    });
  } catch (error) {
    console.error('Signup error:', error.message, error.stack, { code: error.code, name: error.name });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate key error: Buyername, email, or phone number already exists.' });
    }
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}
];

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (email && otp) {
      const user = await Buyer.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      } else {
        const expiresIn = '1h';
        console.log('Generating JWT with expiresIn:', expiresIn);
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn });
        res.json({ token });
      }      
    } else {
      res.status(400).json({ message: 'Email and OTP are required' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};  

exports.buyerImageUpload = (req, res) => {
  upload.single('image')(req, res, async (err) => {
    try {
      // Multer error handling
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await Buyer.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      user.image = `/uploads/${req.file.filename}`;
      await user.save();

      return res.status(200).json({
        message: 'Image uploaded successfully',
        image: user.image,
      });

    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};

exports.signin = [ async (req, res) => {
  
  try {
    const { email, password, rememberMe } = req.body;
    console.log('Signin attempt:', { email, rememberMe });

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 2. Find user
    const user = await Buyer.findOne({ email });
    if (!user) {
      console.log('Signin: Buyer not found:', email);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 3. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Signin: Password match:', isMatch);
    if (!isMatch) {
      // await createLog('Buyer', user._id, user._id, 'Buyer', 'Invalid email or password');
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 4. Set logging data

    // await createLog('Buyer', user._id, user._id, 'Buyer', 'Signin completed successfully');

    // 4. Generate JWT with expiration based on rememberMe
    const expiresIn = rememberMe ? '30d' : '1h';
    console.log('Signin: Generating token with expiresIn:', expiresIn);
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn });

    // 5. Respond with success
    res.status(200).json({
      message: 'Sign-in successful.',
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('Signin error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}
];

exports.validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Buyer.findById(decoded.userId).select('_id');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token: Buyer not found.' });
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Validate token error:', error.message, error.stack);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const email = req.query.email;
    console.log('Fetching profile for user ID:', email);
    const user = await Buyer.findOne({email}).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Buyer not found.' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Profile error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const email = req.body.email;
    console.log('Updating profile for user ID:', email);
    const user = await Buyer.findOneAndUpdate({email}, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Buyer not found.' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Update profile error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error.' });
  }
};  

exports.googleAuth = async (req, res) => {
  try {
    const { idToken, rememberMe } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required.' });
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name } = payload;

    // Check if user exists
    let user = await Buyer.findOne({ email });

    if (!user) {
      // Create new user
      const username = validator.trim(email.split('@')[0]);
      const hashedPassword = await bcrypt.hash(googleId, 10);

      user = new Buyer({
        firstName: validator.escape(given_name || 'Buyer'),
        lastName: validator.escape(family_name || ''),
        username: validator.escape(username),
        email: validator.escape(email),
        city: 'Unknown',
        zipCode: '00000',
        password: hashedPassword,
        agreedToTerms: true,
        googleId,
      });

      await user.save();
    }

    // Generate JWT
    const expiresIn = rememberMe ? '30d' : '1h';
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn });

    res.status(200).json({
      message: user.googleId ? 'Google Sign-In successful.' : 'Buyer created and signed in successfully.',
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('Google Auth error:', error.message, error.stack);
    res.status(500).json({ message: 'Google authentication failed.' });
  }
}

//logout function
exports.logout = [
  require('../middleware/authMiddlewareBuyer'),
  require('../middleware/logger')('Buyer', 'Buyer', 'Logout'),
  async (req, res) => {
    try {
      // Since JWT is stateless, no server-side token invalidation is needed unless you implement a blacklist
      res.referenceId = req.user;
      res.logMessage = 'Logout completed successfully';
      res.status(200).json({ message: 'Logout successful.' });
    } catch (error) {
      console.error('Logout error:', error.message, error.stack);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
];












































// //controllers/authController.js
// const { OAuth2Client } = require('google-auth-library');
// const Buyer = require('../models/Buyer');
// const bcrypt = require('bcryptjs');
// const validator = require('validator');
// const jwt = require('jsonwebtoken');
// // controllers/authController.js
// const { Seller, Media, Review, Order } = require('../models');
// const { BADGE_LABELS, BADGE_COLORS, LANGUAGE_LABELS } = require('../utils/constants');

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Add your Web Client ID to .env

// exports.signup = async (req, res) => {
//   try {
//     let { firstName, lastName, username, emailOrPhone, city, zipCode, password, confirmPassword, agreedToTerms, rememberMe } = req.body;

//     // Sanitize inputs
//     firstName = validator.trim(firstName || '');
//     lastName = validator.trim(lastName || '');
//     username = validator.trim(username || '');
//     emailOrPhone = validator.trim(emailOrPhone || '');
//     city = validator.trim(city || '');
//     zipCode = validator.trim(zipCode || '');
//     password = validator.trim(password || '');
//     confirmPassword = validator.trim(confirmPassword || '');

//     // Escape HTML to prevent XSS
//     firstName = validator.escape(firstName);
//     lastName = validator.escape(lastName);
//     username = validator.escape(username);
//     emailOrPhone = validator.escape(emailOrPhone);
//     city = validator.escape(city);
//     zipCode = validator.escape(zipCode);

//     // 1. Check if all required fields are provided
//     if (!firstName || !lastName || !username || !emailOrPhone || !city || !zipCode || !password || !confirmPassword || agreedToTerms === undefined) {
//       return res.status(400).json({ message: 'All fields are required.' });
//     }

//     // 2. Validate First Name
//     if (firstName.length < 2) {
//       return res.status(400).json({ message: 'First Name must be at least 2 characters.' });
//     }

//     // 3. Validate Last Name
//     if (lastName.length < 2) {
//       return res.status(400).json({ message: 'Last Name must be at least 2 characters.' });
//     }

//     // 4. Validate Buyername
//     if (username.length < 3) {
//       return res.status(400).json({ message: 'Buyername must be at least 3 characters.' });
//     }
//     if (!/^[a-zA-Z0-9_]+$/.test(username)) {
//       return res.status(400).json({ message: 'Buyername can only contain letters, numbers, and underscores.' });
//     }

//     // 5. Validate Email or Phone
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const phoneRegex = /^\d{10}$/;
//     if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
//       return res.status(400).json({ message: 'Enter a valid email or 10-digit phone number.' });
//     }

//     // 6. Validate City
//     if (city.length < 2) {
//       return res.status(400).json({ message: 'City must be at least 2 characters.' });
//     }

//     // 7. Validate Zip Code
//     const zipRegex = /^\d{5,6}$/;
//     if (!zipRegex.test(zipCode)) {
//       return res.status(400).json({ message: 'Zip Code must be 5 or 6 digits.' });
//     }

//     // 8. Validate Password
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.',
//       });
//     }

//     // 9. Validate Confirm Password
//     if (password !== confirmPassword) {
//       return res.status(400).json({ message: 'Passwords do not match.' });
//     }

//     // 10. Validate Agreed to Terms
//     if (!agreedToTerms) {
//       return res.status(400).json({ message: 'You must agree to the Terms of Service.' });
//     }

//     // 11. Check for existing user
//     const existingBuyer = await Buyer.findOne({ $or: [{ username }, { emailOrPhone }] });
//     if (existingBuyer) {
//       return res.status(400).json({ message: 'Buyername or email/phone already exists.' });
//     }

//     // 12. Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 13. Create and save the new user
//     const user = new Buyer({
//       firstName,
//       lastName,
//       username,
//       emailOrPhone,
//       city,
//       zipCode,
//       password: hashedPassword,
//       agreedToTerms,
//     });
//     await user.save();

//     // 14. Generate JWT with expiration based on rememberMe
//     const expiresIn = rememberMe ? '30d' : '1h';
//     console.log('Signup: Generating token with expiresIn:', expiresIn);
//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn });

//     // 15. Respond with success and token
//     res.status(201).json({
//       success: true,
//       message: 'Buyer created successfully.',
//       token,
//       user: { emailOrPhone: user.emailOrPhone, username: user.username },
//     });
//   } catch (error) {
//     console.error('Signup error:', error);
//     res.status(500).json({ message: 'Server error. Please try again later.' });
//   }
// };

// exports.signin = async (req, res) => {
//   try {
//     const { emailOrPhone, password, rememberMe } = req.body;
//     console.log('Signin attempt:', { emailOrPhone, rememberMe });

//     // 1. Validate inputs
//     if (!emailOrPhone || !password) {
//       return res.status(400).json({ message: 'Email/phone and password are required.' });
//     }

//     // 2. Find user
//     const user = await Buyer.findOne({ emailOrPhone });
//     if (!user) {
//       console.log('Signin: Buyer not found:', emailOrPhone);
//       return res.status(401).json({ message: 'Invalid email/phone or password.' });
//     }

//     // 3. Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     console.log('Signin: Password match:', isMatch);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid email/phone or password.' });
//     }

//     // 4. Generate JWT with expiration based on rememberMe
//     const expiresIn = rememberMe ? '30d' : '1h';
//     console.log('Signin: Generating token with expiresIn:', expiresIn);
//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn });

//     // 5. Respond with success
//     res.status(200).json({
//       message: 'Sign-in successful.',
//       token,
//       user: { emailOrPhone: user.emailOrPhone, username: user.username },
//     });
//   } catch (error) {
//     console.error('Signin error:', error);
//     res.status(500).json({ message: 'Server error.' });
//   }
// };

// exports.validateToken = async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split('Bearer ')[1];
//     if (!token) {
//       return res.status(401).json({ message: 'No token provided.' });
//     }

//     // Verify JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await Buyer.findById(decoded.userId).select('_id');
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid token: Buyer not found.' });
//     }

//     res.status(200).json({ valid: true });
//   } catch (error) {
//     console.error('Validate token error:', error);
//     res.status(401).json({ message: 'Invalid token.' });
//   }
// };

// exports.getProfile = async (req, res) => {
//   try {
//     const user = await Buyer.findById(req.user).select('-password');
//     if (!user) {
//       return res.status(404).json({ message: 'Buyer not found.' });
//     }
//     res.status(200).json({ user });
//   } catch (error) {
//     console.error('Profile error:', error);
//     res.status(500).json({ message: 'Server error.' });
//   }
// };


// // Existing signup and signin functions remain unchanged

// exports.googleAuth = async (req, res) => {
//   try {
//     const { idToken, rememberMe } = req.body;

//     if (!idToken) {
//       return res.status(400).json({ message: 'Google ID token is required.' });
//     }

//     // Verify Google ID token
//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: process.env.GOOGLE_CLIENT_ID, // Your Web Client ID
//     });

//     const payload = ticket.getPayload();
//     const { sub: googleId, email, given_name, family_name } = payload;

//     // Check if user exists
//     let user = await Buyer.findOne({ emailOrPhone: email });

//     if (!user) {
//       // Create new user
//       const username = validator.trim(email.split('@')[0]); // Use email prefix as username
//       const hashedPassword = await bcrypt.hash(googleId, 10); // Use Google ID as password (hashed)

//       user = new Buyer({
//         firstName: validator.escape(given_name || 'Buyer'),
//         lastName: validator.escape(family_name || ''),
//         username: validator.escape(username),
//         emailOrPhone: validator.escape(email),
//         city: 'Unknown', // Default value, as Google doesn't provide this
//         zipCode: '00000', // Default value
//         password: hashedPassword,
//         agreedToTerms: true, // Assume agreement for Google Sign-In
//         googleId, // Store Google ID for future reference
//       });

//       await user.save();
//     }

//     // Generate JWT
//     const expiresIn = rememberMe ? '30d' : '1h';
//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn });

//     res.status(200).json({
//       message: user.googleId ? 'Google Sign-In successful.' : 'Buyer created and signed in successfully.',
//       token,
//       user: { emailOrPhone: user.emailOrPhone, username: user.username },
//     });
//   } catch (error) {
//     console.error('Google Auth error:', error);
//     res.status(500).json({ message: 'Google authentication failed.' });
//   }
// };








