const Chat = require('../models/Chat');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');

exports.getChats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user is a buyer or seller
    const buyer = await Buyer.findById(userId);
    const seller = await Seller.findById(userId);

    let chats;
    if (buyer) {
      chats = await Chat.find({ buyer: userId }).populate('buyer seller');
    } else if (seller) {
      chats = await Chat.find({ seller: userId }).populate('buyer seller');
    } else {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

exports.getChat = async (req, res) => {
  try {
    const { buyerId, sellerId } = req.params;
    const userId = req.user.userId;

    if (userId !== buyerId && userId !== sellerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const chat = await Chat.findOne({ buyer: buyerId, seller: sellerId }).populate('buyer seller');
    if (!chat) {
      return res.status(404).json({ success: false, message: 'No chat found' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};