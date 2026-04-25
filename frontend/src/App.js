import axios from "axios";
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

// 🔥 UPDATED BACKEND URL
const API_URL = "https://chat-backend.onrender.com";
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
    } catch (err) {
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
    } catch (err) {
      alert("Signup failed");
    }
  };

  const sendMessage = () => {
    if (!receiver) {
      alert("Enter receiver name");
      return;
    }

    const data = {
      sender,
      receiver: receiver.trim().toLowerCase(),
      message,
    };

    socket.emit("send_message", data);
    setMessage("");
  };

  const loadMessages = async () => {
    if (!sender || !receiver) return;

    const res = await axios.get(
      `${API_URL}/api/messages/${sender}/${receiver}`
    );

    setChat(res.data);
  };

  // ✅ FIXED dependencies
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("typing", (data) => {
      if (data.sender === receiver) {
        setTypingUser(data.sender);
        setTimeout(() => setTypingUser(""), 1000);
      }
    });

    socket.on("seen_update", () => {
      loadMessages();
    });

    return () => {
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("typing");
      socket.off("seen_update");
    };
  }, [receiver, loadMessages]); // ✅ added loadMessages

  // ✅ FIXED dependencies
  useEffect(() => {
    if (loggedIn && receiver) {
      loadMessages();
    }
  }, [receiver, loggedIn, loadMessages]); // ✅ added loadMessages

  // ✅ FIXED dependencies
  useEffect(() => {
    if (receiver) {
      socket.emit("seen", { sender, receiver });
    }
  }, [chat, receiver, sender]); // ✅ added receiver, sender

  return (
    <div className="app">
      {!loggedIn ? (
        <div className="login-page">
          <div className="login-box">
            <h2>Welcome 👋</h2>
            <p>Login to start chatting</p>

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

            <div className="login-buttons">
              <button className="login-btn" onClick={login}>
                Login
              </button>
              <button className="signup-btn" onClick={signup}>
                Signup
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="sidebar">
            <h3>Online Users</h3>
            {onlineUsers.map((user, i) => (
              <p key={i} onClick={() => setReceiver(user)}>
                {user}
              </p>
            ))}
          </div>

          <div className="chat-container">
            <div className="chat-header">
              <h3>{receiver || "Select a user"}</h3>
              {typingUser && <p>{typingUser} is typing...</p>}
            </div>

            <div className="chat-messages">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={
                    msg.sender === sender ? "message own" : "message"
                  }
                >
                  <p>
                    {msg.message}{" "}
                    {msg.sender === sender && (
                      <span>
                        {msg.status === "sent" && "✔"}
                        {msg.status === "delivered" && "✔✔"}
                        {msg.status === "seen" && "✔✔ (seen)"}
                      </span>
                    )}
                  </p>
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
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;