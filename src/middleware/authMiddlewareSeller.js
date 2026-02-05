// middleware/authMiddlewareSeller.js
const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller'); // Fix the path to your Seller model

const authMiddlewareSeller = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided, authorization denied.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find seller by decoded userId (make sure this matches your JWT payload structure)
    const seller = await Seller.findById(decoded.userId).select('_id username email');
    
    if (!seller) {
      return res.status(401).json({ 
        success: false, 
        message: 'Seller not found, authorization denied.' 
      });
    }
    
    // Set req.user to the seller information
    req.user = {
      userId: seller._id.toString(),
      username: seller.username,
      email: seller.email,
      role: "Seller"
    };
    
    console.log('Auth successful - seller ID:', req.user.userId);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired, please login again.',
        role: "Seller"
        
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format.' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

module.exports = authMiddlewareSeller;
