const Enquiry = require('../models/Enquiry');
const validator = require('validator');

exports.submitEnquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, topic, message } = req.body;

    // Sanitize inputs
    const sanitized = {
      firstName: validator.trim(firstName || ''),
      lastName: validator.trim(lastName || ''),
      email: validator.trim(email || ''),
      phone: validator.trim(phone || ''),
      topic: validator.trim(topic || ''),
      message: validator.trim(message || ''),
    };
    for (let key in sanitized) sanitized[key] = validator.escape(sanitized[key]);

    // Validate required fields
    if (!sanitized.firstName || !sanitized.lastName || !sanitized.email || !sanitized.topic || !sanitized.message) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // Validate email
    if (!validator.isEmail(sanitized.email)) {
      return res.status(400).json({ message: 'Invalid email.' });
    }

    // Validate phone (if provided)
    if (sanitized.phone && !/^\+?\d{10,15}$/.test(sanitized.phone)) {
      return res.status(400).json({ message: 'Phone must be a valid number (10-15 digits).' });
    }

    // Save enquiry to MongoDB
    const enquiry = await Enquiry.create({
      firstName: sanitized.firstName,
      lastName: sanitized.lastName,
      email: sanitized.email,
      phone: sanitized.phone,
      topic: sanitized.topic,
      message: sanitized.message
    });

    res.status(201).json({ success: true, message: 'Enquiry submitted successfully.' });
  } catch (error) {
    console.error('Submit Enquiry error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};