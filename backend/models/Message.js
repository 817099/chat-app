const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  message: String,

  // 🔥 ADDED FIELD
  status: {
    type: String,
    default: "sent", // sent → delivered → seen
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", messageSchema);