import React, { useEffect, useRef, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      sender: "myra",
      text: "Hello! I'm Myra 🌸 How can I help you today?",
    },
  ]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("myra_gemini_key") || ""
  );

  const [voice, setVoice] = useState(
    () => localStorage.getItem("myra_voice") || "female-1"
  );

  const [wakeWord, setWakeWord] = useState(false);
  const [listening, setListening] = useState(false);

  const [animePosition, setAnimePosition] = useState(() => {
    try {
      const saved = localStorage.getItem("myra_anime_position");
      return saved ? JSON.parse(saved) : { x: 20, y: 20 };
    } catch {
      return { x: 20, y: 20 };
    }
  });

  const chatRef = useRef(null);
  const animeRef = useRef(null);
  const dragData = useRef(null);

  /* =========================
     SAVE SETTINGS
  ========================= */

  useEffect(() => {
    localStorage.setItem("myra_gemini_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("myra_voice", voice);
  }, [voice]);

  useEffect(() => {
    localStorage.setItem(
      "myra_anime_position",
      JSON.stringify(animePosition)
    );
  }, [animePosition]);

  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = () => {
    const text = message.trim();

    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text,
      },
      {
        sender: "myra",
        text: "I'm Myra. I'm ready to help you! 🤖✨",
      },
    ]);

    setMessage("");
  };

  /* =========================
     VOICE
  ========================= */

  const speak = (text) => {
    if (!window.speechSynthesis) {
      alert("Voice preview is not supported on this device.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();

    const femaleVoice =
      voices.find((v) =>
        /female|zira|samantha|victoria|google us english/i.test(
          v.name
        )
      ) || voices[0];

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.15;

    window.speechSynthesis.speak(utterance);
  };

  const previewVoice = () => {
    speak("Hello! I am Myra. Your AI assistant.");
  };

  /* =========================
     MICROPHONE
  ========================= */

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not available in this browser/device."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);

    recognition.onresult = (event) => {
      const result =
        event.results[0][0].transcript;

      setMessage(result);

      if (/hey myra/i.test(result)) {
        speak("Yes, I'm listening.");
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  /* =========================
     ANIME CREATOR DRAG
  ========================= */

  const startAnimeDrag = (event) => {
    if (!animeRef.current || !chatRef.current) return;

    event.preventDefault();

    const chatRect =
      chatRef.current.getBoundingClientRect();

    const animeRect =
      animeRef.current.getBoundingClientRect();

    dragData.current = {
      startX:
        event.clientX || event.touches?.[0]?.clientX,
      startY:
        event.clientY || event.touches?.[0]?.clientY,

      originalX: animeRect.left - chatRect.left,
      originalY: animeRect.top - chatRect.top,

      chatWidth: chatRect.width,
      chatHeight: chatRect.height,

      animeWidth: animeRect.width,
      animeHeight: animeRect.height,
    };

    window.addEventListener(
      "pointermove",
      moveAnimeDrag
    );

    window.addEventListener(
      "pointerup",
      stopAnimeDrag
    );
  };

  const moveAnimeDrag = (event) => {
    if (!dragData.current) return;

    const data = dragData.current;

    const currentX = event.clientX;
    const currentY = event.clientY;

    let newX =
      data.originalX +
      (currentX - data.startX);

    let newY =
      data.originalY +
      (currentY - data.startY);

    const maxX =
      data.chatWidth - data.animeWidth - 10;

    const maxY =
      data.chatHeight - data.animeHeight - 10;

    newX = Math.max(10, Math.min(newX, maxX));
    newY = Math.max(10, Math.min(newY, maxY));

    setAnimePosition({
      x: newX,
      y: newY,
    });
  };

  const stopAnimeDrag = () => {
    dragData.current = null;

    window.removeEventListener(
      "pointermove",
      moveAnimeDrag
    );

    window.removeEventListener(
      "pointerup",
      stopAnimeDrag
    );
  };

  /* =========================
     ANIME RESET
  ========================= */

  const resetAnimePosition = () => {
    setAnimePosition({
      x: 20,
      y: 20,
    });
  };

  /* =========================
     PERMISSIONS
  ========================= */

  const requestMicrophone = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      alert("Microphone permission allowed.");
    } catch {
      alert(
        "Microphone permission was denied or unavailable."
      );
    }
  };

  const openAppSettings = () => {
    alert(
      "Android system permission settings will be connected here when the native MYRA Android bridge is added."
    );
  };

  /* =========================
     GOOGLE LOGIN
  ========================= */

  const googleLogin = () => {
    alert(
      "Google Sign-In setup will be connected after Firebase/Google configuration."
    );
  };

  return (
    <div className="app">

      {/* =========================
          TOP BAR
      ========================= */}

      <header className="top-bar">

        <div className="logo">
          MYRA AI
        </div>

        <div className="status">
          <span className="status-dot"></span>
          MYRA ONLINE
        </div>

        <button
          className="settings"
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          ⚙️
        </button>

      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main-content">

        {/* MYRA */}

        <section className="myra-section">

          <div className="myra-avatar">
            <div className="avatar-placeholder">
              MYRA
            </div>
          </div>

          <h1>Myra</h1>

          <p>
            {listening
              ? "Listening..."
              : "I'm listening..."}
          </p>

        </section>

        {/* =========================
            CHAT
        ========================= */}

        <section
          className="chat-section"
          ref={chatRef}
        >

          <div className="chat-header">

            <div>
              <div className="chat-title">
                MYRA CONVERSATION
              </div>

              <div className="chat-subtitle">
                AI Assistant • Voice Ready
              </div>
            </div>

            <div className="ai-pulse"></div>

          </div>

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

          {/* =========================
              DRAGGABLE ANIME CREATOR
          ========================= */}

          <div
            ref={animeRef}
            className="anime-creator"
            style={{
              left: `${animePosition.x}px`,
              top: `${animePosition.y}px`,
            }}
          >

            <div
              className="anime-drag-handle"
              onPointerDown={startAnimeDrag}
            >

              <span className="anime-title">
                ✨ ANIME CREATOR
              </span>

              <span className="anime-status">
                READY
              </span>

            </div>

            <div className="anime-preview">

              <div className="anime-face">

                <div className="anime-hair"></div>

                <div className="anime-eye left"></div>
                <div className="anime-eye right"></div>

                <div className="anime-mouth"></div>

              </div>

            </div>

            <div className="anime-controls">

              <button
                type="button"
                onClick={() =>
                  alert("Anime style options coming soon.")
                }
              >
                STYLE
              </button>

              <button
                type="button"
                onClick={resetAnimePosition}
              >
                RESET
              </button>

            </div>

          </div>

          {/* =========================
              INPUT
          ========================= */}

          <div className="input-area">

            <input
              type="text"
              placeholder="Ask Myra anything..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />

            <button
              className={`mic-button ${
                listening ? "active" : ""
              }`}
              type="button"
              onClick={startListening}
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

      {/* =========================
          SETTINGS
      ========================= */}

      {settingsOpen && (

        <div
          className="settings-overlay"
          onClick={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setSettingsOpen(false);
            }
          }}
        >

          <div className="settings-panel">

            <div className="settings-header">

              <h2>⚙️ MYRA SETTINGS</h2>

              <button
                className="close-settings"
                type="button"
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                ✕
              </button>

            </div>

            {/* GEMINI */}

            <div className="setting-card">

              <h3>🔑 Gemini API</h3>

              <p>
                Enter your own Gemini API key.
                It is stored locally on this device.
              </p>

              <input
                type="password"
                placeholder="Paste Gemini API key..."
                value={apiKey}
                onChange={(e) =>
                  setApiKey(e.target.value)
                }
              />

            </div>

            {/* VOICE */}

            <div className="setting-card">

              <h3>🎙️ Myra Voice</h3>

              <p>
                Choose Myra's voice and test it.
              </p>

              <select
                value={voice}
                onChange={(e) =>
                  setVoice(e.target.value)
                }
              >

                <option value="female-1">
                  Female Voice 1
                </option>

                <option value="female-2">
                  Female Voice 2
                </option>

                <option value="female-3">
                  Female Voice 3
                </option>

                <option value="female-4">
                  Female Voice 4
                </option>

              </select>

              <button
                className="setting-button"
                type="button"
                onClick={previewVoice}
              >
                ▶ Preview Voice
              </button>

            </div>

            {/* HEY MYRA */}

            <div className="setting-card">

              <h3>🟢 Hey Myra</h3>

              <p>
                Foreground voice activation.
                Full background wake-word support
                will require the native Android layer.
              </p>

              <div className="wake-toggle">

                <span>
                  Wake word
                </span>

                <div
                  className={`toggle ${
                    wakeWord ? "active" : ""
                  }`}
                  onClick={() =>
                    setWakeWord(!wakeWord)
                  }
                ></div>

              </div>

            </div>

            {/* GOOGLE LOGIN */}

            <div className="setting-card">

              <h3>🔐 Google Sign-In</h3>

              <p>
                Google account login will be connected
                through Firebase.
              </p>

              <button
                className="setting-button"
                type="button"
                onClick={googleLogin}
              >
                Continue with Google
              </button>

            </div>

            {/* PERMISSIONS */}

            <div className="setting-card">

              <h3>📱 Permissions Center</h3>

              <p>
                Allow the permissions MYRA needs.
                Android may show its own permission screen.
              </p>

              <div className="permission-row">

                <div>
                  <div className="permission-name">
                    🎤 Microphone
                  </div>

                  <div className="permission-status">
                    Required for voice
                  </div>
                </div>

                <button
                  className="permission-button"
                  type="button"
                  onClick={requestMicrophone}
                >
                  Allow
                </button>

              </div>

              <div className="permission-row">

                <div>
                  <div className="permission-name">
                    📞 Phone
                  </div>

                  <div className="permission-status">
                    For call actions
                  </div>
                </div>

                <button
                  className="permission-button"
                  type="button"
                  onClick={openAppSettings}
                >
                  Settings
                </button>

              </div>

              <div className="permission-row">

                <div>
                  <div className="permission-name">
                    📂 Apps
                  </div>

                  <div className="permission-status">
                    For app commands
                  </div>
                </div>

                <button
                  className="permission-button"
                  type="button"
                  onClick={openAppSettings}
                >
                  Settings
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;
