import loginBg from "./assets/login-bg.png";
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

  // IMAGE STATES
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // UPLOAD IMAGE
  const uploadImage = async (file) => {
    try {
      const formData = new FormData();

      formData.append("file", file);

      const res = await axios.post(
        `${API_URL}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return res.data.url;
    } catch (err) {
      console.log("Upload error:", err);
      return null;
    }
  };

  // LOGIN
  const login = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      setSender(res.data.username);

      socket.emit(
        "register",
        res.data.username
      );

      setLoggedIn(true);

    } catch {
      alert("Login failed");
    }
  };

  // SIGNUP
  const signup = async () => {
    try {
      await axios.post(
        `${API_URL}/api/auth/signup`,
        {
          username,
          password,
        }
      );

      alert("Signup successful");

    } catch {
      alert("Signup failed");
    }
  };

  // SEND MESSAGE
  const sendMessage = async () => {

    if (!receiver) {
      alert("Select a user");
      return;
    }

    let imageUrl = null;

    if (image) {
      imageUrl = await uploadImage(image);
    }

    socket.emit("send_message", {
      sender,
      receiver,
      message,
      image: imageUrl,
    });

    setMessage("");
    setImage(null);
    setPreview(null);
  };

  // LOAD MESSAGES
  const loadMessages = useCallback(async () => {

    if (!sender || !receiver) return;

    const res = await axios.get(
      `${API_URL}/api/messages/${sender}/${receiver}`
    );

    setChat(res.data);

  }, [sender, receiver]);

  // SOCKET EVENTS
  useEffect(() => {

    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on(
      "online_users",
      setOnlineUsers
    );

    socket.on("typing", (data) => {

      if (data.sender === receiver) {

        setTypingUser(data.sender);

        setTimeout(() => {
          setTypingUser("");
        }, 1000);

      }
    });

    socket.on(
      "seen_update",
      loadMessages
    );

    return () => {
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("typing");
      socket.off("seen_update");
    };

  }, [receiver, loadMessages]);

  // LOAD OLD MESSAGES
  useEffect(() => {

    if (loggedIn && receiver) {
      loadMessages();
    }

  }, [receiver, loggedIn, loadMessages]);

  // SEEN STATUS
  useEffect(() => {

    if (receiver) {

      socket.emit("seen", {
        sender,
        receiver,
      });

    }

  }, [chat, receiver, sender]);

  return (

    <div className="app">

      {!loggedIn ? (

        /* LOGIN PAGE */
        <div className="login-page">

          {/* LEFT SIDE */}
          <div
            className="login-left"
            style={{
              backgroundImage: `linear-gradient(
                rgba(0,0,0,0.45),
                rgba(0,0,0,0.45)
              ), url(${loginBg})`
            }}
          >

            <div className="welcome-content">

              <div className="logo-circle">
                💬
              </div>

              <h1>
                Welcome to <br />
                <span>Chatify</span>
              </h1>

              <div className="green-line"></div>

              <p>
                Stay connected, share moments,
                anytime, anywhere.
              </p>

            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="login-right">

            <div className="login-box">

              {/* TOP ICON */}
              <div className="login-top-icon">
                💬
              </div>

              {/* TITLE */}
              <h2>Sign In</h2>

              <p className="login-subtitle">
                Welcome back! Please sign in to continue
              </p>

              {/* USERNAME */}
              <label className="login-label">
                Username
              </label>

              <div className="input-box">

                <span className="input-icon">
                  👤
                </span>

                <input
                  type="text"
                  placeholder="Enter your username"
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .trim()
                        .toLowerCase()
                    )
                  }
                />

              </div>

              {/* PASSWORD */}
              <label className="login-label">
                Password
              </label>

              <div className="input-box">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  type="password"
                  placeholder="Enter your password"
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                />

                <span className="eye-icon">
                  👁️
                </span>

              </div>

              {/* OPTIONS */}
              <div className="login-options">

                <label className="remember-box">

                  <input type="checkbox" />

                  Remember me

                </label>

                <a href="/">
                  Forgot password?
                </a>

              </div>

              {/* LOGIN BUTTON */}
              <button
                className="login-btn"
                onClick={login}
              >
                Sign In
              </button>

              {/* DIVIDER */}
              <div className="divider">
                <span>or</span>
              </div>

              {/* SIGNUP BUTTON */}
              <button
                className="signup-btn"
                onClick={signup}
              >
                ➕ Create New Account
              </button>

              {/* FOOTER */}
              <div className="login-footer">
                © 2026 Chatify. All rights reserved.
              </div>

            </div>

          </div>

        </div>

      ) : (

        <>
          {/* SIDEBAR */}
          <div className="sidebar">

            <div className="sidebar-header">
              Chats
            </div>

            {onlineUsers.map((user, i) => (

              <div
                key={i}
                className="user-item"
                onClick={() =>
                  setReceiver(user)
                }
              >

                <div className="avatar">
                  {user[0].toUpperCase()}
                </div>

                <span>{user}</span>

              </div>

            ))}

          </div>

          {/* CHAT AREA */}
          <div className="chat-container">

            <div className="chat-header">

              <strong>
                {receiver || "Select a user"}
              </strong>

              {typingUser && (
                <span>
                  {" "}typing...
                </span>
              )}

            </div>

            {/* MESSAGES */}
            <div className="chat-messages">

              {chat.map((msg, i) => {

                const time = new Date(
                  msg.createdAt
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (

                  <div
                    key={i}
                    className={
                      msg.sender === sender
                        ? "message own"
                        : "message"
                    }
                  >

                    <div className="msg-text">

                      {msg.message}

                      {msg.image && (

                        <img
                          src={msg.image}
                          alt="chat"
                          className="chat-img"
                        />

                      )}

                    </div>

                    <div className="msg-meta">

                      <span className="time">
                        {time}
                      </span>

                      {msg.sender === sender && (

                        <span
                          className={
                            msg.status === "seen"
                              ? "tick seen"
                              : "tick"
                          }
                        >

                          {msg.status === "sent" && "✔"}

                          {msg.status === "delivered" && "✔✔"}

                          {msg.status === "seen" && "✔✔"}

                        </span>

                      )}

                    </div>

                  </div>

                );

              })}

            </div>

            {/* IMAGE PREVIEW */}
            {preview && (

              <div className="image-preview">

                <img
                  src={preview}
                  alt="preview"
                />

                <button
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                  }}
                >
                  ❌
                </button>

              </div>

            )}

            {/* INPUT AREA */}
            <div className="chat-input">

              <input
                placeholder="Type a message"
                value={message}
                onChange={(e) => {

                  setMessage(
                    e.target.value
                  );

                  socket.emit("typing", {
                    sender,
                    receiver,
                  });

                }}
              />

              <input
                type="file"
                onChange={(e) => {

                  const file =
                    e.target.files[0];

                  setImage(file);

                  if (file) {

                    setPreview(
                      URL.createObjectURL(file)
                    );

                  }

                }}
              />

              <button onClick={sendMessage}>
                ➤
              </button>

            </div>

          </div>
        </>
      )}

    </div>
  );
}

export default App;