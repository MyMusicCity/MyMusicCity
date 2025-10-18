import React from "react";

export default function Messages() {
  return (
    <div className="messages-page">
      <div className="chat-sidebar">
        <h3>MESSAGES</h3>
        <input placeholder="Search" />
        <div className="chat-list-item">
          <strong>Jake Seals</strong>
          <p>Ok how about 6:30 meet at rand</p>
          <small>6/2/24</small>
        </div>
      </div>
      <div className="chat-window">
        <h4>Jake Seals</h4>
        <div className="chat-thread">
          <p><strong>Jake:</strong> concert tn? :D:D:D</p>
          <p className="me">ok my seats are row k seat 2</p>
          <p><strong>Jake:</strong> seat 3 for me</p>
        </div>
      </div>
    </div>
  );
}
