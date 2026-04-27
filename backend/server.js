require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ IMPORTANT: use dynamic port (Render fix)
const PORT = process.env.PORT || 5000;

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

// 🔥 ROUTES (keep BEFORE socket + listen)

// ✅ auth route
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// ✅ message route
const messageRoutes = require("./routes/messages");
app.use("/api/messages", messageRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// models
const Message = require("./models/Message");

// store online users
let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (username) => {
    users[username] = socket.id;
    io.emit("online_users", Object.keys(users));
  });

  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocketId = users[receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { sender });
    }
  });

  socket.on("send_message", async (data) => {
    try {
      const { sender, receiver, message, image} = data;

      const newMessage = new Message({
        sender,
        receiver,
        message,
        image,
        status: "sent",
      });

      await newMessage.save();

      const receiverSocketId = users[receiver];

      if (receiverSocketId) {
        newMessage.status = "delivered";
        await newMessage.save();

        io.to(receiverSocketId).emit("receive_message", newMessage);
      }

      socket.emit("receive_message", newMessage);
    } catch (error) {
      console.log("Error saving message:", error);
    }
  });

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

  socket.on("disconnect", () => {
    for (let user in users) {
      if (users[user] === socket.id) {
        delete users[user];
      }
    }

    io.emit("online_users", Object.keys(users));
  });
});

// ✅ start server
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});