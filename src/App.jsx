import React, { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      sender: "myra",
      text: "Hello! I'm Myra 🌸 How can I help you today?",
    },
  ]);

  const sendMessage = () => {
    const text = message.trim();

    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: text,
      },
      {
        sender: "myra",
        text: "I'm Myra. I'm ready to help you! 🤖✨",
      },
    ]);

    setMessage("");
  };

  return (
    <div className="app">
      <header className="top-bar">
        <div className="logo">MYRA AI</div>

        <div className="status">
          <span className="status-dot"></span>
          MYRA ONLINE
        </div>

        <button className="settings" type="button">
          ⚙️
        </button>
      </header>

      <main className="main-content">
        <section className="myra-section">
          <div className="myra-avatar">
            <div className="avatar-placeholder">MYRA</div>
          </div>

          <h1>Myra</h1>
          <p>I'm listening...</p>
        </section>

        <section className="chat-section">
          <div className="chat-box">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`message ${item.sender}`}
              >
                {item.text}
              </div>
            ))}
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="Ask Myra anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />

            <button
              className="mic-button"
              type="button"
              aria-label="Microphone"
            >
              🎤
            </button>

            <button
              className="send-button"
              type="button"
              onClick={sendMessage}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
