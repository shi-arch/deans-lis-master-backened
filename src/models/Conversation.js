const mongoose = require("mongoose");

// Force delete existing model to reload schema
if (mongoose.models.Conversation) {
  delete mongoose.models.Conversation;
}

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,  // ObjectId to match controller casting
    required: true,
  },
  role: {
    type: String,
    enum: ["Buyer", "Seller"],  // Exact casing
    required: true,
  },
});

const conversationSchema = new mongoose.Schema({
  participants: [participantSchema],  // Array of { userId, role }
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',  // References Message model
  }],
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);