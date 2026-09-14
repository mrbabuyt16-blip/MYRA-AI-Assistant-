import React, { useEffect, useRef, useState } from "react";

/* ================= GEMINI ================= */

const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
}

/* ================= STORAGE ================= */

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

/* ================= HELPERS ================= */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[।?!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ================= APP ================= */

export default function App() {
  const [tab, setTab] = useState("myra");
  const [settingsPage, setSettingsPage] = useState(null);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);

  const [messages, setMessages] = useState(() =>
    loadJSON("myra_messages", [
      {
        role: "assistant",
        text: "Hello! I'm MYRA. How can I help you today?",
      },
    ])
  );

  const [apiKey, setApiKey] = useState(
    localStorage.getItem("myra_gemini_key") || ""
  );

  const [connected, setConnected] = useState(
    !!localStorage.getItem("myra_gemini_key")
  );

  const [voiceEnabled, setVoiceEnabled] = useState(
    localStorage.getItem("myra_voice") !== "false"
  );

  const [language, setLanguage] = useState(
    localStorage.getItem("myra_language") || "Follow phone"
  );

  const [memories, setMemories] = useState(() =>
    loadJSON("myra_memories", [])
  );

  const [tasks, setTasks] = useState(() =>
    loadJSON("myra_tasks", [
      {
        id: 1,
        title: "Study session",
        time: "7:00 PM",
        done: false,
      },
      {
        id: 2,
        title: "Review today's notes",
        time: "9:00 PM",
        done: false,
      },
    ])
  );

  const [history, setHistory] = useState(() =>
    loadJSON("myra_history", [])
  );

  const [memorySearch, setMemorySearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  /* ================= SAVE ================= */

  useEffect(() => {
    localStorage.setItem(
      "myra_messages",
      JSON.stringify(messages)
    );
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(
      "myra_memories",
      JSON.stringify(memories)
    );
  }, [memories]);

  useEffect(() => {
    localStorage.setItem(
      "myra_tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(
      "myra_history",
      JSON.stringify(history)
    );
  }, [history]);

  useEffect(() => {
    localStorage.setItem(
      "myra_voice",
      String(voiceEnabled)
    );
  }, [voiceEnabled]);

  useEffect(() => {
    localStorage.setItem(
      "myra_language",
      language
    );
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, thinking]);

  /* ================= API KEY ================= */

  const saveApiKey = () => {
    const key = apiKey.trim();

    if (!key) {
      setConnected(false);
      localStorage.removeItem("myra_gemini_key");

      alert("Please paste your Gemini API key.");
      return;
    }

    localStorage.setItem("myra_gemini_key", key);
    setApiKey(key);
    setConnected(true);

    alert("Gemini API key saved successfully.");
  };

  const disconnectApi = () => {
    localStorage.removeItem("myra_gemini_key");

    setApiKey("");
    setConnected(false);

    alert("Gemini disconnected.");
  };

  /* ================= VOICE OUTPUT ================= */

  const speak = (text) => {
    if (!voiceEnabled) return;

    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
      .replace(/[*#`]/g, "")
      .trim();

    if (!cleanText) return;

    const utterance =
      new SpeechSynthesisUtterance(cleanText);

    if (language === "Bangla") {
      utterance.lang = "bn-BD";
    } else if (language === "English") {
      utterance.lang = "en-US";
    } else {
      utterance.lang =
        navigator.language || "en-US";
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  /* ================= PHONE ================= */

  const makeCall = (phone) => {
    const number = phone.trim();

    if (!number) {
      addAssistant(
        "Please enter a phone number first."
      );
      return;
    }

    window.location.href = `tel:${encodeURIComponent(
      number
    )}`;
  };

  /* ================= SMS ================= */

  const openSms = (phone, message) => {
    const number = phone.trim();

    if (!number) {
      addAssistant(
        "Please enter the recipient phone number first."
      );
      return;
    }

    const body = encodeURIComponent(
      message || ""
    );

    window.location.href =
      `sms:${encodeURIComponent(number)}?body=${body}`;
  };

  /* ================= MESSAGE ================= */

  const addAssistant = (text, shouldSpeak = true) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    if (shouldSpeak) {
      speak(text);
    }
  };

  /* ================= DEVICE COMMANDS ================= */

  const processCommand = (text) => {
    const command = normalize(text);

    /* CALL */

    if (
      command.startsWith("call ") ||
      command.startsWith("কল ") ||
      command.startsWith("ফোন ")
    ) {
      const phone = text
        .replace(/^call\s*/i, "")
        .replace(/^কল\s*/i, "")
        .replace(/^ফোন\s*/i, "")
        .replace(/করো?/gi, "")
        .trim();

      if (/^[+0-9\s-]{6,}$/.test(phone)) {
        addAssistant(
          `Opening phone dialer for ${phone}...`,
          false
        );

        setTimeout(() => {
          makeCall(phone);
        }, 300);

        return true;
      }

      addAssistant(
        "Call করতে contact name নয়, phone number দিতে হবে। উদাহরণ: Call 01712345678"
      );

      return true;
    }

    /* SMS */

    if (
      command.startsWith("sms ") ||
      command.startsWith("send sms ") ||
      command.startsWith("message ") ||
      command.startsWith("মেসেজ ") ||
      command.startsWith("এসএমএস ")
    ) {
      addAssistant(
        "SMS পাঠাতে নিচের SMS button ব্যবহার করো। MYRA সরাসরি SMS পাঠাবে না; তোমার ফোনের Messages app খুলবে।"
      );

      return true;
    }

    return false;
  };

  /* ================= GEMINI ================= */

  const sendMessage = async (customText) => {
    const text = (customText ?? input).trim();

    if (!text || thinking) return;

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    const commandHandled = processCommand(text);

    if (commandHandled) {
      return;
    }

    const key =
      localStorage.getItem("myra_gemini_key") ||
      apiKey.trim();

    if (!key) {
      addAssistant(
        "Gemini API key সেট করা নেই। Settings → AI Key এ গিয়ে key paste করে Save & Connect চাপো।"
      );

      return;
    }

    setThinking(true);

    try {
      const recentMessages = [
        ...messages,
        {
          role: "user",
          text,
        },
      ].slice(-12);

      const contents = recentMessages.map(
        (item) => ({
          role:
            item.role === "assistant"
              ? "model"
              : "user",

          parts: [
            {
              text: item.text,
            },
          ],
        })
      );

      const response = await fetch(
        `${getGeminiUrl()}?key=${encodeURIComponent(
          key
        )}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You are MYRA, a helpful AI assistant. Give clear, useful and natural answers. If the user speaks Bangla, reply in Bangla. If the user speaks English, reply in English. Keep answers concise unless more detail is requested.",
                },
              ],
            },

            contents,

            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            `Gemini API error: ${response.status}`
        );
      }

      const answer =
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

      if (!answer) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      addAssistant(answer);

      setHistory((prev) => [
        {
          id: Date.now(),
          text,
          answer,
          time: new Date().toLocaleString(),
        },
        ...prev,
      ]);

      setConnected(true);
    } catch (error) {
      console.error("MYRA Gemini:", error);

      const message =
        error?.message || "Unknown error";

      addAssistant(
        `Gemini connection failed.\n\n${message}\n\nCheck your API key, internet connection and Gemini API access.`
      );

      setConnected(false);
    } finally {
      setThinking(false);
    }
  };

  /* ================= VOICE INPUT ================= */

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addAssistant(
        "Voice recognition is not supported on this device."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      language === "Bangla"
        ? "bn-BD"
        : language === "English"
        ? "en-US"
        : navigator.language || "en-US";

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setListening(false);
      setInput("");

      sendMessage(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  /* ================= MEMORY ================= */

  const addMemory = () => {
    const value = window.prompt(
      "What should MYRA remember?"
    );

    if (!value?.trim()) return;

    setMemories((prev) => [
      {
        id: Date.now(),
        text: value.trim(),
        time: new Date().toLocaleString(),
      },
      ...prev,
    ]);
  };

  const deleteMemory = (id) => {
    setMemories((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const exportMemory = () => {
    const blob = new Blob(
      [JSON.stringify(memories, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "myra-memory.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  /* ================= TASKS ================= */

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              done: !task.done,
            }
          : task
      )
    );
  };

  /* ================= HISTORY ================= */

  const clearHistory = () => {
    if (
      window.confirm(
        "Delete all MYRA history?"
      )
    ) {
      setHistory([]);
    }
  };

  /* ================= HEADER ================= */

  const Header = ({
    title,
    back = false,
  }) => (
    <header className="myra-header">
      <div className="brand-small">
        <div className="brand-dot" />

        <div>
          <strong>{title}</strong>
          <span>MYRA AI</span>
        </div>
      </div>

      <button
        className="icon-btn"
        onClick={() => {
          if (back) {
            setSettingsPage(null);
          } else {
            setTab("settings");
            setSettingsPage(null);
          }
        }}
      >
        {back ? "←" : "⚙"}
      </button>
    </header>
  );

  /* ================= HOME ================= */

  const renderHome = () => (
    <section className="screen myra-screen">
      <Header title="MYRA AI" />

      <div className="hero-area">
        <div
          className={`myra-orb ${
            listening ? "orb-listening" : ""
          } ${thinking ? "orb-thinking" : ""}`}
        >
          <div className="orb-ring ring-one" />
          <div className="orb-ring ring-two" />
          <div className="orb-ring ring-three" />

          <div className="orb-core">
            <span>MYRA</span>
          </div>
        </div>

        <div className="greeting">
          <h1>Good Evening.</h1>

          <p>
            {listening
              ? "I'm listening..."
              : thinking
              ? "Thinking..."
              : "How can I help you today?"}
          </p>
        </div>
      </div>

      <div className="quick-row">
        <button
          onClick={() =>
            sendMessage(
              "Give me a short helpful daily brief."
            )
          }
        >
          ✦ Brief
        </button>

        <button
          onClick={() =>
            sendMessage(
              "What should I focus on today?"
            )
          }
        >
          ◇ Focus
        </button>

        <button
          onClick={() =>
            setMessages([
              {
                role: "assistant",
                text:
                  "New conversation started. I'm ready.",
              },
            ])
          }
        >
          ＋ New
        </button>
      </div>

      <div className="command-actions">
        <button
          className="command-action"
          onClick={() =>
            addAssistant(
              "Call command: type Call followed by a phone number. Example: Call 01712345678"
            )
          }
        >
          📞 Call
        </button>

        <button
          className="command-action"
          onClick={() =>
            addAssistant(
              "SMS: enter a phone number and message below, then MYRA will open your Messages app."
            )
          }
        >
          💬 SMS
        </button>

        <button
          className="command-action"
          onClick={() =>
            addAssistant(
              "You can ask MYRA anything through Gemini."
            )
          }
        >
          🤖 AI
        </button>
      </div>

      <div className="compact-chat">
        {messages.slice(-6).map(
          (message, index) => (
            <div
              key={index}
              className={`mini-message ${
                message.role === "user"
                  ? "user-mini"
                  : "ai-mini"
              }`}
            >
              <span>
                {message.role === "user"
                  ? "YOU"
                  : "MYRA"}
              </span>

              <p>{message.text}</p>
            </div>
          )
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="voice-control">
        <button
          className={`mic-button ${
            listening ? "active" : ""
          }`}
          onClick={startVoice}
        >
          {listening ? "■" : "🎙"}
        </button>

        <span>
          {listening
            ? "Listening..."
            : thinking
            ? "Thinking..."
            : "Tap to speak"}
        </span>
      </div>

      <div className="text-input-wrap">
        <input
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Ask MYRA anything..."
        />

        <button
          onClick={() => sendMessage()}
          disabled={thinking}
        >
          ➤
        </button>
      </div>

      {!connected && (
        <button
          className="key-warning"
          onClick={() => {
            setTab("settings");
            setSettingsPage("key");
          }}
        >
          ⚠ Connect Gemini API
        </button>
      )}
    </section>
  );

  /* ================= TODAY ================= */

  const renderToday = () => (
    <section className="screen">
      <Header title="Today" />

      <div className="page-title">
        <span>MYRA DAILY</span>

        <h1>
          {new Date().toLocaleDateString(
            undefined,
            {
              weekday: "long",
            }
          )}
        </h1>

        <p>
          {new Date().toLocaleDateString(
            undefined,
            {
              day: "numeric",
              month: "long",
              year: "numeric",
            }
          )}
        </p>
      </div>

      <div className="today-card featured-card">
        <span className="card-label">
          MYRA BRIEF
        </span>

        <h2>Stay focused.</h2>

        <p>
          Complete your important tasks first,
          then take some time to relax.
        </p>

        <button
          onClick={() =>
            sendMessage(
              "Give me a short daily brief."
            )
          }
        >
          Generate brief →
        </button>
      </div>

      <div className="section-head">
        <h2>Tasks</h2>

        <span>
          {
            tasks.filter(
              (task) => !task.done
            ).length
          }{" "}
          remaining
        </span>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <button
            key={task.id}
            className={`task-card ${
              task.done
                ? "task-done"
                : ""
            }`}
            onClick={() =>
              toggleTask(task.id)
            }
          >
            <span className="task-check">
              {task.done ? "✓" : ""}
            </span>

            <div>
              <strong>
                {task.title}
              </strong>

              <small>
                {task.time}
              </small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );

  /* ================= MEMORY ================= */

  const renderMemory = () => {
    const filtered = memories.filter(
      (item) =>
        item.text
          .toLowerCase()
          .includes(
            memorySearch.toLowerCase()
          )
    );

    return (
      <section className="screen">
        <Header title="Memory" />

        <div className="page-title">
          <span>MYRA MEMORY</span>

          <h1>Your memories.</h1>

          <p>
            Memories are stored locally on this
            device.
          </p>
        </div>

        <div className="search-box">
          🔎

          <input
            value={memorySearch}
            onChange={(e) =>
              setMemorySearch(
                e.target.value
              )
            }
            placeholder="Search memory..."
          />
        </div>

        <div className="memory-actions">
          <button onClick={addMemory}>
            ＋ Add
          </button>

          <button onClick={exportMemory}>
            ↑ Export
          </button>
        </div>

        <div className="memory-list">
          {filtered.length === 0 ? (
            <div className="empty-card">
              <span>◎</span>

              <strong>
                No memories yet
              </strong>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                className="memory-card"
                key={item.id}
              >
                <div>
                  <strong>
                    {item.text}
                  </strong>

                  <small>
                    {item.time}
                  </small>
                </div>

                <button
                  onClick={() =>
                    deleteMemory(item.id)
                  }
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    );
  };

  /* ================= SETTINGS ================= */

  const renderSettings = () => {
    if (settingsPage === "key") {
      return (
        <section className="screen">
          <Header
            title="AI Key"
            back
          />

          <div className="page-title">
            <span>AI CONNECTION</span>

            <h1>Gemini AI</h1>

            <p>
              Connect MYRA to Google Gemini.
            </p>
          </div>

          <div className="setting-card">
            <div className="connection-status">
              <span
                className={
                  connected
                    ? "status-blue"
                    : "status-off"
                }
              />

              <div>
                <strong>
                  {connected
                    ? "Gemini Connected"
                    : "Not Connected"}
                </strong>

                <small>
                  {connected
                    ? "MYRA can use Gemini."
                    : "Paste your API key below."}
                </small>
              </div>
            </div>
          </div>

          <div className="setting-card">
            <label>
              Gemini API Key
            </label>

            <input
              className="key-input"
              type="password"
              value={apiKey}
              onChange={(e) =>
                setApiKey(e.target.value)
              }
              placeholder="Paste Gemini API key"
            />

            <small>
              The key is stored locally on this
              device.
            </small>

            <button
              className="connect-button"
              onClick={saveApiKey}
            >
              🔵 Save & Connect
            </button>

            {connected && (
              <button
                className="disconnect-button"
                onClick={disconnectApi}
              >
                Disconnect
              </button>
            )}
          </div>

          <div className="setting-card">
            <strong>
              Provider
            </strong>

            <div className="provider-grid">
              <button className="selected">
                Gemini
              </button>

              <button disabled>
                OpenAI
              </button>

              <button disabled>
                xAI Grok
              </button>

              <button disabled>
                OpenRouter
              </button>
            </div>
          </div>

          <p className="note">
            For a production app, API keys should
            be handled by a secure backend.
          </p>
        </section>
      );
    }

    if (settingsPage === "voice") {
      return (
        <section className="screen">
          <Header
            title="Voice"
            back
          />

          <div className="page-title">
            <span>VOICE</span>

            <h1>Voice Control</h1>
          </div>

          <div className="toggle-card">
            <div>
              <strong>
                MYRA Voice
              </strong>

              <small>
                MYRA speaks AI answers.
              </small>
            </div>

            <button
              className={`switch ${
                voiceEnabled
                  ? "on"
                  : ""
              }`}
              onClick={() =>
                setVoiceEnabled(
                  (value) => !value
                )
              }
            >
              <span />
            </button>
          </div>

          <button
            className="wide-button"
            onClick={() =>
              speak(
                "Hello. I am MYRA. Voice is working."
              )
            }
          >
            🔊 Test MYRA Voice
          </button>
        </section>
      );
    }

    if (settingsPage === "language") {
      return (
        <section className="screen">
          <Header
            title="Language"
            back
          />

          <div className="page-title">
            <span>LANGUAGE</span>

            <h1>Language</h1>
          </div>

          <div className="language-pills">
            {[
              "Follow phone",
              "English",
              "Bangla",
            ].map((item) => (
              <button
                key={item}
                className={
                  language === item
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setLanguage(item)
                }
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (settingsPage === "history") {
      const filtered =
        history.filter((item) =>
          `${item.text} ${item.answer}`
            .toLowerCase()
            .includes(
              historySearch.toLowerCase()
            )
        );

      return (
        <section className="screen">
          <Header
            title="History"
            back
          />

          <div className="page-title">
            <span>
              CONVERSATIONS
            </span>

            <h1>History</h1>
          </div>

          <div className="search-box">
            🔎

            <input
              value={historySearch}
              onChange={(e) =>
                setHistorySearch(
                  e.target.value
                )
              }
              placeholder="Search history..."
            />
          </div>

          {filtered.map((item) => (
            <div
              className="history-card"
              key={item.id}
            >
              <strong>
                {item.text}
              </strong>

              <small>
                {item.time}
              </small>
            </div>
          ))}

          {history.length > 0 && (
            <button
              className="danger-btn"
              onClick={clearHistory}
            >
              Delete history
            </button>
          )}
        </section>
      );
    }

    return (
      <section className="screen">
        <Header title="Settings" />

        <div className="page-title">
          <span>MYRA CONTROL</span>

          <h1>Settings</h1>
        </div>

        <div className="settings-list">
          <button
            onClick={() =>
              setSettingsPage("key")
            }
          >
            <span>⌘</span>

            <div>
              <strong>
                AI Key & Connection
              </strong>

              <small>
                {connected
                  ? "🔵 Gemini connected"
                  : "API key required"}
              </small>
            </div>

            <b>›</b>
          </button>

          <button
            onClick={() =>
              setSettingsPage("voice")
            }
          >
            <span>♫</span>

            <div>
              <strong>
                Voice
              </strong>

              <small>
                {voiceEnabled
                  ? "Voice enabled"
                  : "Voice disabled"}
              </small>
            </div>

            <b>›</b>
          </button>

          <button
            onClick={() =>
              setSettingsPage("language")
            }
          >
            <span>文</span>

            <div>
              <strong>
                Language
              </strong>

              <small>
                {language}
              </small>
            </div>

            <b>›</b>
          </button>

          <button
            onClick={() =>
              setSettingsPage("history")
            }
          >
            <span>◷</span>

            <div>
              <strong>
                History
              </strong>

              <small>
                {history.length} conversations
              </small>
            </div>

            <b>›</b>
          </button>
        </div>
      </section>
    );
  };

  /* ================= SMS QUICK PANEL ================= */

  const SmsPanel = () => {
    const [phone, setPhone] = useState("");
    const [message, setMessage] =
      useState("");

    return (
      <div className="sms-panel">
        <strong>💬 Send SMS</strong>

        <input
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
          placeholder="Phone number"
          inputMode="tel"
        />

        <textarea
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          placeholder="Message"
          rows={3}
        />

        <button
          onClick={() =>
            openSms(phone, message)
          }
        >
          Open Messages →
        </button>
      </div>
    );
  };

  /* ================= MAIN ================= */

  return (
    <main className="myra-app">
      <div className="app-shell">
        {tab === "myra" &&
          renderHome()}

        {tab === "today" &&
          renderToday()}

        {tab === "memory" &&
          renderMemory()}

        {tab === "settings" &&
          renderSettings()}

        <nav className="bottom-nav">
          <button
            className={
              tab === "myra"
                ? "active"
                : ""
            }
            onClick={() => {
              setTab("myra");
              setSettingsPage(null);
            }}
          >
            <span>◉</span>
            <small>MYRA</small>
          </button>

          <button
            className={
              tab === "today"
                ? "active"
                : ""
            }
            onClick={() => {
              setTab("today");
              setSettingsPage(null);
            }}
          >
            <span>▣</span>
            <small>Today</small>
          </button>

          <button
            className={
              tab === "memory"
                ? "active"
                : ""
            }
            onClick={() => {
              setTab("memory");
              setSettingsPage(null);
            }}
          >
            <span>♢</span>
            <small>Memory</small>
          </button>

          <button
            className={
              tab === "settings"
                ? "active"
                : ""
            }
            onClick={() => {
              setTab("settings");
              setSettingsPage(null);
            }}
          >
            <span>⚙</span>
            <small>Settings</small>
          </button>
        </nav>
      </div>
    </main>
  );
  }
