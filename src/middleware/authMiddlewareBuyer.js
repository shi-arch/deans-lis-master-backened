const jwt = require('jsonwebtoken');
const Buyer = require('../models/Buyer');

const authMiddlewareBuyer = async (req, res, next) => {
  // Case-insensitive header lookup
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided, authorization denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const buyer = await Buyer.findById(decoded.userId);

    //const buyer = await Buyer.findById(decoded.userId).select('_id');
    if (!buyer) {
      return res.status(401).json({ success: false, message: 'User not found, authorization denied.' });
    }
    
    // ✅ FIX: Set req.user as an object with userId property
    req.user = { 
      userId: buyer._id.toString(),
      username: buyer.username, 
      email: buyer.email, 
      role: "Buyer"
     };
    next();
  } catch (error) {
    console.error('Token verification error:', {
      message: error.message,
      name: error.name,
      expiredAt: error.expiredAt || null,
    });
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddlewareBuyer;
