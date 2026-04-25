const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// GET chat between two users
router.get("/:sender/:receiver", async (req, res) => {
  try {
    const { sender, receiver } = req.params;

    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;