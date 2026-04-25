require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 🔥 Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// middleware
app.use(cors());
app.use(express.json());

// 🔥 MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// 🔥 Routes
const messageRoutes = require("./routes/messages");
app.use("/api/messages", messageRoutes);

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

const Message = require("./models/Message");

// store online users
let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // register user
  socket.on("register", (username) => {
    users[username] = socket.id;
    console.log("Registered:", username);

    io.emit("online_users", Object.keys(users));
  });

  // 🔥 NEW: typing event
  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocketId = users[receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { sender });
    }
  });

  // send private message
  socket.on("send_message", async (data) => {
    try {
      const { sender, receiver, message } = data;

      // 🔥 ADD status field
      const newMessage = new Message({
        sender,
        receiver,
        message,
        status: "sent",
      });

      await newMessage.save();

      const receiverSocketId = users[receiver];

      // 🔥 delivered update
      if (receiverSocketId) {
        newMessage.status = "delivered";
        await newMessage.save();

        io.to(receiverSocketId).emit("receive_message", newMessage);
      }

      // send back to sender
      socket.emit("receive_message", newMessage);
    } catch (error) {
      console.log("Error saving message:", error);
    }
  });

  // 🔥 NEW: seen event
  socket.on("seen", async ({ sender, receiver }) => {
    await Message.updateMany(
      { sender: receiver, receiver: sender },
      { status: "seen" }
    );

    const senderSocketId = users[sender];
    if (senderSocketId) {
      io.to(senderSocketId).emit("seen_update");
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    for (let user in users) {
      if (users[user] === socket.id) {
        delete users[user];
      }
    }

    io.emit("online_users", Object.keys(users));
    console.log("User disconnected");
  });
});

// start server
server.listen(5000, () => {
  console.log("Server running on port 5000");
});