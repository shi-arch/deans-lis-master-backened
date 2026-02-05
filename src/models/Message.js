const mongoose = require("mongoose");

// Force delete existing model to reload schema
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderRole",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "receiverRole",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["Buyer", "Seller"],
      required: true,
    },
    receiverRole: {
      type: String,
      enum: ["Buyer", "Seller"],
      required: true,
    },
    senderModel: {  // Optional
      type: String,
      enum: ["Buyer", "Seller"],
      required: false,
    },
    receiverModel: {  // Optional
      type: String,
      enum: ["Buyer", "Seller"],
      required: false,
    },
    orderId: {  // Optional for general messaging
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
    text: {
      type: String,
      required: false,
    },
    attachments: {
      url: { type: String },
      type: { type: String, enum: ["image", "video", "document"] },
    },
    type: {  // Expanded enum to include text messages
      type: String,
      enum: ["text", "file"],
      required: false,
      default: "text",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);