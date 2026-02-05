const Buyer = require("../models/Buyer");
const Seller = require("../models/Seller");

const userSocketMap = {}; // { userId: socketId }

// Get socket ID of a receiver for real-time messaging
const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

// Set up Socket.IO for real-time chat functionality
const setupSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
      // Verify if user is Buyer or Seller
      const buyer = await Buyer.findById(userId).select("_id");
      const seller = await Seller.findById(userId).select("_id");
      if (buyer || seller) {
        userSocketMap[userId] = socket.id;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
      }
    }

    // Handle sending messages in real-time
    socket.on("sendMessage", async (messageData) => {
      const { senderId, receiverId, message, file } = messageData;
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", {
          senderId,
          receiverId,
          message,
          file,
          createdAt: new Date(),
          shouldShake: true,
        });
      }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id);
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
};

module.exports = { getReceiverSocketId, setupSocket };