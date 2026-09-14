import React, { useEffect, useRef, useState } from "react";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

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
  const [thinking, setThinking] = useState(false);

  const [animePosition, setAnimePosition] = useState(() => {
    try {
      const saved = localStorage.getItem("myra_anime_position");
      return saved ? JSON.parse(saved) : { x: 20, y: 20 };
    } catch {
      return { x: 20, y: 20 };
    }
  });

  const [lastInteractionId, setLastInteractionId] = useState(
    () => localStorage.getItem("myra_interaction_id") || ""
  );

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

  useEffect(() => {
    if (lastInteractionId) {
      localStorage.setItem(
        "myra_interaction_id",
        lastInteractionId
      );
    } else {
      localStorage.removeItem("myra_interaction_id");
    }
  }, [lastInteractionId]);

  /* =========================
     AUTO SCROLL
  ========================= */

  useEffect(() => {
    const box = chatRef.current?.querySelector(".chat-box");

    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }, [messages, thinking]);

  /* =========================
     VOICE
  ========================= */

  const speak = (text) => {
    if (!window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();

    let selectedVoice = null;

    if (voice === "female-1") {
      selectedVoice =
        voices.find((v) =>
          /samantha|zira|google.*female|female/i.test(v.name)
        ) || voices[0];
    }

    if (voice === "female-2") {
      selectedVoice =
        voices.find((v) =>
          /victoria|karen|moira/i.test(v.name)
        ) || voices[1] || voices[0];
    }

    if (voice === "female-3") {
      selectedVoice =
        voices.find((v) =>
          /susan|hazel|aria/i.test(v.name)
        ) || voices[2] || voices[0];
    }

    if (voice === "female-4") {
      selectedVoice =
        voices.find((v) =>
          /google.*uk|google.*us|english/i.test(v.name)
        ) || voices[3] || voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.12;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  const previewVoice = () => {
    speak("Hello! I am Myra. Your AI assistant.");
  };

  /* =========================
     GEMINI API
  ========================= */

  const askGemini = async (text) => {
    if (!apiKey.trim()) {
      throw new Error(
        "Gemini API key is missing. Open Settings and add your API key."
      );
    }

    const body = {
      model: "gemini-3.8-flash",
      input: text,
      generation_config: {
        thinking_level: "low",
      },
      system_instruction:
        "You are MYRA, a friendly futuristic AI assistant. " +
        "Give clear, useful and concise answers. " +
        "You can understand Bangla, Banglish and English. " +
        "If the user speaks Bangla or Banglish, reply naturally in the same style.",
    };

    if (lastInteractionId) {
      body.previous_interaction_id = lastInteractionId;
    }

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify(body),
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      throw new Error("Gemini returned an invalid response.");
    }

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        `Gemini API error (${response.status})`;

      throw new Error(errorMessage);
    }

    const answer =
      data?.output_text ||
      data?.steps
        ?.flatMap((step) => step.content || [])
        ?.filter((item) => item.type === "text")
        ?.map((item) => item.text)
        ?.join("\n") ||
      "I couldn't generate a response.";

    if (data?.id) {
      setLastInteractionId(data.id);
    }

    return answer;
  };

  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = async () => {
    const text = message.trim();

    if (!text || thinking) return;

    setMessage("");

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text,
      },
    ]);

    setThinking(true);

    try {
      const answer = await askGemini(text);

      setMessages((prev) => [
        ...prev,
        {
          sender: "myra",
          text: answer,
        },
      ]);

      speak(answer);
    } catch (error) {
      const errorText =
        error?.message ||
        "Something went wrong while connecting to Gemini.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "myra",
          text: `⚠️ ${errorText}`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  /* =========================
     NEW CHAT
  ========================= */

  const newChat = () => {
    setMessages([
      {
        sender: "myra",
        text: "New conversation started 🌸 How can I help you?",
      },
    ]);

    setLastInteractionId("");
    window.speechSynthesis?.cancel();
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
        "Speech recognition is not available on this device."
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
        event.results?.[0]?.[0]?.transcript || "";

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

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  /* =========================
     ANIME DRAG
  ========================= */

  const startAnimeDrag = (event) => {
    if (!animeRef.current || !chatRef.current) return;

    event.preventDefault();

    const chatRect =
      chatRef.current.getBoundingClientRect();

    const animeRect =
      animeRef.current.getBoundingClientRect();

    dragData.current = {
      startX: event.clientX,
      startY: event.clientY,

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

    let newX =
      data.originalX +
      (event.clientX - data.startX);

    let newY =
      data.originalY +
      (event.clientY - data.startY);

    const maxX =
      data.chatWidth -
      data.animeWidth -
      10;

    const maxY =
      data.chatHeight -
      data.animeHeight -
      10;

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
      "Android App Info connection will be added in the native Android update."
    );
  };

  /* =========================
     GOOGLE LOGIN
  ========================= */

  const googleLogin = () => {
    alert(
      "Google Sign-In will be connected through the native Firebase Android setup."
    );
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="app">

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
        >
          ⚙️
        </button>

      </header>

      <main className="main-content">

        <section className="myra-section">

          <div className="myra-avatar">
            <div className="avatar-placeholder">
              MYRA
            </div>
          </div>

          <h1>Myra</h1>

          <p>
            {thinking
              ? "Thinking..."
              : listening
              ? "Listening..."
              : "I'm listening..."}
          </p>

        </section>

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
                Gemini AI • Voice Ready
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

            {thinking && (
              <div className="message myra">
                <span>MYRA is thinking...</span>
              </div>
            )}

          </div>

          {/* ANIME CREATOR */}

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
                  alert(
                    "Anime customization will be added in the next update."
                  )
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

          {/* INPUT */}

          <div className="input-area">

            <input
              type="text"
              placeholder={
                thinking
                  ? "MYRA is thinking..."
                  : "Ask Myra anything..."
              }
              value={message}
              disabled={thinking}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
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
              disabled={thinking}
            >
              🎤
            </button>

            <button
              className="send-button"
              type="button"
              onClick={sendMessage}
              disabled={thinking}
            >
              ➤
            </button>

          </div>

        </section>

      </main>

      {/* SETTINGS */}

      {settingsOpen && (

        <div
          className="settings-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
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
                Add your Gemini API key to enable
                real AI responses.
              </p>

              <input
                type="password"
                placeholder="Paste Gemini API key..."
                value={apiKey}
                onChange={(e) =>
                  setApiKey(e.target.value)
                }
              />

              <button
                className="setting-button"
                type="button"
                onClick={() =>
                  alert(
                    apiKey
                      ? "Gemini API key saved on this device."
                      : "Please enter a Gemini API key."
                  )
                }
              >
                💾 Save API Key
              </button>

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
                Background wake-word will be added
                through the native Android layer.
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
                Native Google Sign-In will be
                connected through Firebase.
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

              <h3>📱 Permissions</h3>

              <p>
                Android system permissions will be
                connected in the native Android update.
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
                    📱 Android App Info
                  </div>

                  <div className="permission-status">
                    Native settings connection
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

            {/* NEW CHAT */}

            <div className="setting-card">

              <h3>🧹 Conversation</h3>

              <button
                className="setting-button"
                type="button"
                onClick={newChat}
              >
                Start New Chat
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;
