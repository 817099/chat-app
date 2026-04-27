import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

const API_URL = "https://chat-backend-83gz.onrender.com";
const socket = io(API_URL);

function App() {
  const [sender, setSender] = useState("");
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [typingUser, setTypingUser] = useState("");

  const login = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      setSender(res.data.username);
      socket.emit("register", res.data.username);
      setLoggedIn(true);
    } catch {
      alert("Login failed");
    }
  };

  const signup = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/signup`, {
        username,
        password,
      });
      alert("Signup successful");
    } catch {
      alert("Signup failed");
    }
  };

  const sendMessage = () => {
    if (!receiver) {
      alert("Select a user");
      return;
    }

    socket.emit("send_message", {
      sender,
      receiver,
      message,
    });

    setMessage("");
  };

  const loadMessages = useCallback(async () => {
    if (!sender || !receiver) return;

    const res = await axios.get(
      `${API_URL}/api/messages/${sender}/${receiver}`
    );

    setChat(res.data);
  }, [sender, receiver]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on("online_users", setOnlineUsers);

    socket.on("typing", (data) => {
      if (data.sender === receiver) {
        setTypingUser(data.sender);
        setTimeout(() => setTypingUser(""), 1000);
      }
    });

    socket.on("seen_update", loadMessages);

    return () => {
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("typing");
      socket.off("seen_update");
    };
  }, [receiver, loadMessages]);

  useEffect(() => {
    if (loggedIn && receiver) loadMessages();
  }, [receiver, loggedIn, loadMessages]);

  useEffect(() => {
    if (receiver) socket.emit("seen", { sender, receiver });
  }, [chat, receiver, sender]);

  return (
    <div className="app">
      {!loggedIn ? (
        /* 🔐 LOGIN UI */
        <div className="login-page">
          <div className="login-box">
            <h2>WhatsApp Clone 💬</h2>

            <input
              placeholder="Username"
              onChange={(e) =>
                setUsername(e.target.value.trim().toLowerCase())
              }
            />

            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login}>Login</button>
            <button onClick={signup}>Signup</button>
          </div>
        </div>
      ) : (
        <>
          {/* 🔥 SIDEBAR */}
          <div className="sidebar">
            <div className="sidebar-header">Chats</div>

            {onlineUsers.map((user, i) => (
              <div
                key={i}
                className="user-item"
                onClick={() => setReceiver(user)}
              >
                <div className="avatar">
                  {user[0].toUpperCase()}
                </div>
                <span>{user}</span>
              </div>
            ))}
          </div>

          {/* 🔥 CHAT AREA */}
          <div className="chat-container">
            <div className="chat-header">
              <strong>{receiver || "Select a user"}</strong>
              {typingUser && <span> typing...</span>}
            </div>

            <div className="chat-messages">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={
                    msg.sender === sender
                      ? "message own"
                      : "message"
                  }
                >
                  {msg.message}

                  {msg.sender === sender && (
                    <span className="status">
                      {msg.status === "sent" && "✔"}
                      {msg.status === "delivered" && "✔✔"}
                      {msg.status === "seen" && "✔✔✓"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                placeholder="Type a message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  socket.emit("typing", { sender, receiver });
                }}
              />
              <button onClick={sendMessage}>➤</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;