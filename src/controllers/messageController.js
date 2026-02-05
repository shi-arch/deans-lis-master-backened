const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Buyer = require("../models/Buyer");
const Seller = require("../models/Seller");
const { getReceiverSocketId } = require("../socket/socket");
const { io } = require("../server");
const mongoose = require("mongoose");

// Log enum for debug (remove after test)
console.log('Type enum values:', Message.schema.path('type')?.enumValues);

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: receiverIdStr } = req.params;
    const senderIdStr = req.user.userId;
    const senderRole = req.user.role;

    // Cast IDs
    let senderId, receiverId;
    try {
      senderId = new mongoose.Types.ObjectId(senderIdStr);
      receiverId = new mongoose.Types.ObjectId(receiverIdStr);
      console.log('Casted IDs - sender:', senderId.toString(), 'receiver:', receiverId.toString());
    } catch (castError) {
      console.error('Cast error:', castError);
      return res.status(400).json({ error: 'Invalid sender or receiver ID format' });
    }

    // Validate receiver
    const receiver = await (senderRole === "Buyer" ? Seller : Buyer).findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }
    const receiverRole = senderRole === "Buyer" ? "Seller" : "Buyer";

    // File handling
    let attachmentsData = null;
    if (req.file) {
      const fileType = req.file.mimetype.startsWith("image") ? "image" : req.file.mimetype.startsWith("video") ? "video" : "document";
      attachmentsData = {
        url: `/uploads/${req.file.filename}`,
        type: fileType,
      };
    }

    // FIXED QUERY: Use $and with $elemMatch for reliable matching on array of objects
    console.log('Searching conversation with participants:', [{ userId: senderId.toString(), role: senderRole }, { userId: receiverId.toString(), role: receiverRole }]);
    let conversation = await Conversation.findOne({
      $and: [
        { 'participants': { $elemMatch: { userId: senderId, role: senderRole } } },
        { 'participants': { $elemMatch: { userId: receiverId, role: receiverRole } } },
      ],
    });

    if (!conversation) {
      console.log('No conversation found, creating new...');
      try {
        conversation = await Conversation.create({
          participants: [
            { userId: senderId, role: senderRole },
            { userId: receiverId, role: receiverRole },
          ],
        });
        console.log('Conversation created successfully, ID:', conversation._id);
      } catch (createError) {
        console.error('Conversation create error:', createError);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }
    } else {
      console.log('Found existing conversation, ID:', conversation._id);
    }

    // New message with defaults (omit orderId)
    const newMessage = new Message({
      senderId,
      receiverId,
      senderRole,
      receiverRole,
      senderModel: senderRole,
      receiverModel: receiverRole,
      // orderId omitted (optional)
      text: message || "",
      attachments: attachmentsData,
      type: attachmentsData ? "file" : "text",
    });

    try {
      await newMessage.save();
      console.log('Message saved, ID:', newMessage._id);
    } catch (messageError) {
      console.error('Message save error:', messageError);
      return res.status(500).json({ error: 'Failed to save message' });
    }

    // Update conversation
    conversation.messages.push(newMessage._id);
    try {
      await conversation.save();
      console.log('Conversation updated with new message');
    } catch (convUpdateError) {
      console.error('Conversation update error:', convUpdateError);
      return res.status(500).json({ error: 'Failed to update conversation' });
    }

    // Socket emit
    const receiverSocketId = getReceiverSocketId(receiverIdStr);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage.toObject(),
        shouldShake: true,
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Full error in sendMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all messages in a conversation
const getMessages = async (req, res) => {
  try {
    const { id: userToChatIdStr } = req.params;
    const senderIdStr = req.user.userId;
    const senderRole = req.user.role;

    let senderId, userToChatId;
    try {
      senderId = new mongoose.Types.ObjectId(senderIdStr);
      userToChatId = new mongoose.Types.ObjectId(userToChatIdStr);
    } catch (castError) {
      return res.status(400).json({ error: 'Invalid sender or receiver ID format' });
    }

    const receiverRole = senderRole === "Buyer" ? "Seller" : "Buyer";
    const receiver = await (senderRole === "Buyer" ? Seller : Buyer).findById(userToChatId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    // FIXED QUERY: Use $and with $elemMatch for reliable matching
    console.log('Querying conversation with participants:', [{ userId: senderId.toString(), role: senderRole }, { userId: userToChatId.toString(), role: receiverRole }]);

    const conversation = await Conversation.findOne({
      $and: [
        { 'participants': { $elemMatch: { userId: senderId, role: senderRole } } },
        { 'participants': { $elemMatch: { userId: userToChatId, role: receiverRole } } },
      ],
    }).populate({
      path: "messages",
      populate: [
        { path: "senderId", model: senderRole },
        { path: "receiverId", model: receiverRole },
      ],
    });

    console.log('Found conversation ID:', conversation ? conversation._id : 'null');
    console.log('Number of messages:', conversation ? conversation.messages.length : 0);

    if (!conversation) return res.status(200).json([]);

    res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Full error in getMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get recent conversations
const getRecentConversations = async (req, res) => {
  try {
    console.log('getRecentConversations called with user:', req.user);  // Debug - full req.user

    const senderIdStr = req.user.userId;
    console.log('Sender ID string:', senderIdStr, 'Type:', typeof senderIdStr, 'Length:', senderIdStr.length);  // Debug - type/length check

    if (!mongoose.Types.ObjectId.isValid(senderIdStr)) {
      console.error('Invalid sender ID:', senderIdStr);  // Debug
      return res.status(400).json({ error: 'Invalid sender ID format' });
    }

    const senderId = new mongoose.Types.ObjectId(senderIdStr);
    const senderRole = req.user.role;

    console.log('Fetching recent conversations for user:', senderId.toString(), 'role:', senderRole);

    // Find all conversations for the user
    const conversations = await Conversation.find({ 
      'participants.userId': senderId 
    })
      .populate({
        path: 'messages',
        options: { sort: { createdAt: -1 }, limit: 1 },
        populate: [
          { path: "senderId", model: senderRole },
          { path: "receiverId", model: senderRole === "Buyer" ? "Seller" : "Buyer" },
        ],
      })
      .populate({
        path: 'participants',
        match: { userId: { $ne: senderId } },
        populate: [
          { path: 'userId', model: senderRole === "Buyer" ? "Seller" : "Buyer" },
        ],
      })
      .sort({ updatedAt: -1 })
      .limit(10);

    console.log('Found conversations:', conversations.length);

    const recentChats = conversations.map(conv => {
      const otherParticipant = conv.participants[0];
      const lastMessage = conv.messages[0];
      const unreadCount = conv.messages.filter(m => m.senderId.toString() !== senderId.toString()).length;

      const otherUser = otherParticipant?.userId;
      return {
        id: conv._id.toString(),
        receiverId: otherUser?._id.toString(),
        receiverName: otherUser?.username || otherUser?.first_name || 'Unknown',
        receiverAvatar: otherUser?.image || otherUser?.avatar || 'https://placehold.co/80x80',
        lastMessage: lastMessage ? lastMessage.text || 'No messages yet' : 'No messages yet',
        lastMessageTime: lastMessage ? new Date(lastMessage.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        unreadCount: unreadCount > 99 ? '99+' : unreadCount,
        receiverRole: otherParticipant?.role,
      };
    });

    console.log('Mapped recent chats:', recentChats.length);
    console.log('Sample recent chat:', recentChats[0]);

    res.status(200).json(recentChats);
  } catch (error) {
    console.error('Error fetching recent conversations:', error);
    res.status(500).json({ error: 'Failed to load recent chats' });
  }
};

module.exports = { sendMessage, getMessages, getRecentConversations };