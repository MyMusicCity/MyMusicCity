import React, { useState } from "react";
import "../styles.css";

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState("Jake Seals");
  const [newMessage, setNewMessage] = useState("");

  const [chats, setChats] = useState([
    {
      name: "Jake Seals",
      preview: "Ok how about 6:30 meet at rand",
      date: "6/2/24",
      messages: [
        { sender: "Jake", text: "concert tn? :D:D:D" },
        { sender: "me", text: "ok my seats are row k seat 2" },
        { sender: "Jake", text: "seat 3 for me" },
        { sender: "Jake", text: "Ok how about 6:30 meet at rand" },
      ],
    },
    {
      name: "Annette Ma",
      preview: "Leaving campus at 5!",
      date: "6/2/24",
      messages: [
        { sender: "Annette", text: "Leaving campus at 5!" },
        { sender: "me", text: "perfect see you there" },
      ],
    },
    {
      name: "Vikash Singh",
      preview: "We should get burgers before the show",
      date: "6/2/24",
      messages: [
        { sender: "Vikash", text: "We should get burgers before the show" },
        { sender: "me", text: "LMAO yeah i’m down" },
      ],
    },
    {
      name: "Taylors WiFt",
      preview: "see u at Bridgestone!!!",
      date: "6/2/24",
      messages: [
        { sender: "Taylors", text: "see u at Bridgestone!!!" },
        { sender: "me", text: "let’s goooo" },
      ],
    },
  ]);

  const chat = chats.find((c) => c.name === selectedChat);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const updatedChats = chats.map((c) =>
      c.name === selectedChat
        ? {
            ...c,
            messages: [...c.messages, { sender: "me", text: newMessage }],
            preview: newMessage,
          }
        : c
    );

    setChats(updatedChats);
    setNewMessage("");
  };

  return (
    <div className="messages-page">
      {/* LEFT SIDEBAR */}
      <div className="chat-sidebar">
        <h3>MESSAGES</h3>
        <div className="search-bar">
          <input placeholder="Search" />
        </div>

        {chats.map((c) => (
          <div
            key={c.name}
            className={`chat-list-item ${
              selectedChat === c.name ? "active" : ""
            }`}
            onClick={() => setSelectedChat(c.name)}
          >
            <div className="chat-list-info">
              <strong>{c.name}</strong>
              <p>{c.preview}</p>
            </div>
            <small>{c.date}</small>
          </div>
        ))}
      </div>

      {/* RIGHT CHAT WINDOW */}
      <div className="chat-window">
        {chat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-avatar">
                {chat.name.charAt(0)}
              </div>
              <div>
                <h4>{chat.name}</h4>
                <p className="chat-subtext">BILLIE EILISH at Bridgestone Arena</p>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="chat-thread">
              {chat.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-message ${
                    msg.sender === "me" ? "me" : "them"
                  }`}
                >
                  {msg.sender !== "me" && (
                    <div className="avatar-small">
                      {msg.sender.charAt(0)}
                    </div>
                  )}
                  <div
                    className={`chat-bubble ${
                      msg.sender === "me" ? "me" : "them"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="chat-input">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button onClick={handleSend}>Send</button>
            </div>
          </>
        ) : (
          <p className="no-chat">Select a conversation</p>
        )}
      </div>
    </div>
  );
}
