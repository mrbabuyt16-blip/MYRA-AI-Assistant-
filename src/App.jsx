import React, { useEffect, useRef, useState } from "react";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

const defaultTasks = [
  { id: 1, title: "Study session", time: "7:00 PM", done: false },
  { id: 2, title: "Review today's notes", time: "9:00 PM", done: false },
];

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tab, setTab] = useState("myra");
  const [settingsPage, setSettingsPage] = useState(null);

  const [messages, setMessages] = useState(() =>
    loadJSON("myra_messages", [
      {
        role: "assistant",
        text: "Hello! I'm MYRA. How can I help you today?",
      },
    ])
  );

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);

  const [apiKey, setApiKey] = useState(
    localStorage.getItem("myra_gemini_key") || ""
  );

  const [voiceEnabled, setVoiceEnabled] = useState(
    localStorage.getItem("myra_voice") !== "false"
  );

  const [heyMyra, setHeyMyra] = useState(
    localStorage.getItem("myra_wake") === "true"
  );

  const [language, setLanguage] = useState(
    localStorage.getItem("myra_language") || "Follow phone"
  );

  const [provider, setProvider] = useState(
    localStorage.getItem("myra_provider") || "Gemini"
  );

  const [memories, setMemories] = useState(() =>
    loadJSON("myra_memories", [])
  );

  const [tasks, setTasks] = useState(() =>
    loadJSON("myra_tasks", defaultTasks)
  );

  const [history, setHistory] = useState(() =>
    loadJSON("myra_history", [])
  );

  const [memorySearch, setMemorySearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const [animeOpen, setAnimeOpen] = useState(
    localStorage.getItem("myra_anime_open") === "true"
  );

  const [animeName, setAnimeName] = useState(
    localStorage.getItem("myra_anime_name") || "MYRA"
  );

  const [lastInteractionId, setLastInteractionId] = useState(
    localStorage.getItem("myra_last_interaction") || ""
  );

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("myra_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("myra_memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem("myra_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("myra_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("myra_gemini_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("myra_voice", String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    localStorage.setItem("myra_wake", String(heyMyra));
  }, [heyMyra]);

  useEffect(() => {
    localStorage.setItem("myra_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("myra_provider", provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem("myra_anime_open", String(animeOpen));
  }, [animeOpen]);

  useEffect(() => {
    localStorage.setItem("myra_anime_name", animeName);
  }, [animeName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const speak = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (customText) => {
    const text = (customText ?? input).trim();

    if (!text || thinking) return;

    setInput("");

    const userMessage = {
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setThinking(true);

    if (!apiKey) {
      const reply =
        "Gemini API key is not set yet. Open Settings → AI Key and add your Gemini API key.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
        },
      ]);

      setThinking(false);
      return;
    }

    if (provider !== "Gemini") {
      const reply = `${provider} provider is selected, but only Gemini is connected in this version.`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
        },
      ]);

      setThinking(false);
      return;
    }

    try {
      const body = {
        model: GEMINI_MODEL,
        input: text,
      };

      if (lastInteractionId) {
        body.previous_interaction_id = lastInteractionId;
      }

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || `Gemini request failed (${response.status})`
        );
      }

      const answer =
        data?.output_text ||
        data?.output?.find?.((item) => item.type === "text")?.text ||
        "I received a response, but couldn't read the text.";

      if (data?.id) {
        setLastInteractionId(data.id);
        localStorage.setItem("myra_last_interaction", data.id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: answer,
        },
      ]);

      setHistory((prev) => [
        {
          id: Date.now(),
          text,
          answer,
          time: new Date().toLocaleString(),
          turns: 2,
        },
        ...prev,
      ]);

      speak(answer);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Sorry, I couldn't connect to Gemini.\n\n${error.message}`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Voice recognition is not supported on this device/browser.",
        },
      ]);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang =
      language === "Bangla"
        ? "bn-BD"
        : language === "English"
        ? "en-US"
        : navigator.language || "en-US";

    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      sendMessage(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const newChat = () => {
    setMessages([
      {
        role: "assistant",
        text: "New conversation started. I'm ready.",
      },
    ]);

    setLastInteractionId("");
    localStorage.removeItem("myra_last_interaction");
  };

  const addMemory = () => {
    const value = window.prompt("What should MYRA remember?");

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
    setMemories((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const exportMemory = () => {
    const blob = new Blob([JSON.stringify(memories, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "myra-memory.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  const importMemory = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (!Array.isArray(imported)) {
          throw new Error("Invalid memory file");
        }

        setMemories(imported);
        alert("MYRA memory imported successfully.");
      } catch {
        alert("Invalid memory JSON file.");
      }
    };

    reader.readAsText(file);
  };

  const clearHistory = () => {
    if (!window.confirm("Delete all MYRA conversation history?")) return;

    setHistory([]);
  };

  const openSettings = () => {
    setTab("settings");
    setSettingsPage(null);
  };

  const renderHeader = (title, back = false) => (
    <header className="myra-header">
      <div className="brand-small">
        <div className="brand-dot" />
        <div>
          <strong>{title}</strong>
          <span>MYRA AI</span>
        </div>
      </div>

      {back ? (
        <button className="icon-btn" onClick={() => setSettingsPage(null)}>
          ←
        </button>
      ) : (
        <button className="icon-btn" onClick={openSettings}>
          ⚙
        </button>
      )}
    </header>
  );

  const renderMyra = () => (
    <section className="screen myra-screen">
      {renderHeader("MYRA AI")}

      <div className="hero-area">
        <div
          className={`myra-orb ${listening ? "orb-listening" : ""} ${
            thinking ? "orb-thinking" : ""
          }`}
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
        <button onClick={() => sendMessage("Give me today's brief")}>
          ✦ Brief
        </button>

        <button onClick={() => sendMessage("What should I focus on today?")}>
          ◇ Focus
        </button>

        <button onClick={newChat}>＋ New</button>
      </div>

      {messages.length > 1 && (
        <div className="compact-chat">
          {messages.slice(-4).map((message, index) => (
            <div
              key={index}
              className={`mini-message ${
                message.role === "user" ? "user-mini" : "ai-mini"
              }`}
            >
              <span>{message.role === "user" ? "YOU" : "MYRA"}</span>
              <p>{message.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="voice-control">
        <button
          className={`mic-button ${listening ? "active" : ""}`}
          onClick={startVoice}
          aria-label="Voice"
        >
          {listening ? "■" : "🎙"}
        </button>

        <span>
          {listening ? "Listening..." : thinking ? "Thinking..." : "Tap to speak"}
        </span>
      </div>

      <div className="text-input-wrap">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Ask MYRA anything..."
        />

        <button onClick={() => sendMessage()} disabled={thinking}>
          ➤
        </button>
      </div>

      {!apiKey && (
        <button
          className="key-warning"
          onClick={() => {
            setTab("settings");
            setSettingsPage("key");
          }}
        >
          ⚠ Gemini API key required
        </button>
      )}

      {animeOpen && (
        <div className="anime-panel">
          <div className="anime-avatar">MY</div>
          <div>
            <strong>{animeName}</strong>
            <small>MYRA companion</small>
          </div>
          <button onClick={() => setAnimeOpen(false)}>×</button>
        </div>
      )}

      <button
        className="anime-toggle"
        onClick={() => setAnimeOpen((v) => !v)}
      >
        🤖
      </button>
    </section>
  );

  const renderToday = () => {
    const today = new Date();

    return (
      <section className="screen">
        {renderHeader("Today")}

        <div className="page-title">
          <span>MYRA DAILY</span>
          <h1>
            {today.toLocaleDateString(undefined, {
              weekday: "long",
            })}
          </h1>
          <p>
            {today.toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="today-card featured-card">
          <span className="card-label">MYRA BRIEF</span>
          <h2>Stay focused.</h2>
          <p>
            Complete your important tasks first, then give yourself time to
            relax.
          </p>
          <button onClick={() => sendMessage("Give me my daily brief")}>
            Generate brief →
          </button>
        </div>

        <div className="section-head">
          <h2>Tasks</h2>
          <span>{tasks.filter((x) => !x.done).length} remaining</span>
        </div>

        <div className="task-list">
          {tasks.map((task) => (
            <button
              key={task.id}
              className={`task-card ${task.done ? "task-done" : ""}`}
              onClick={() => toggleTask(task.id)}
            >
              <span className="task-check">{task.done ? "✓" : ""}</span>

              <div>
                <strong>{task.title}</strong>
                <small>{task.time}</small>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderMemory = () => {
    const filtered = memories.filter((item) =>
      item.text.toLowerCase().includes(memorySearch.toLowerCase())
    );

    return (
      <section className="screen">
        {renderHeader("Memory")}

        <div className="page-title">
          <span>MYRA MEMORY</span>
          <h1>Your memories.</h1>
          <p>Things you choose to save stay stored locally on this device.</p>
        </div>

        <div className="search-box">
          🔎
          <input
            value={memorySearch}
            onChange={(e) => setMemorySearch(e.target.value)}
            placeholder="Search memory..."
          />
        </div>

        <div className="memory-actions">
          <button onClick={addMemory}>＋ Add memory</button>
          <button onClick={exportMemory}>↑ Export</button>

          <label>
            ↓ Import
            <input type="file" accept=".json,application/json" onChange={importMemory} />
          </label>
        </div>

        <div className="memory-list">
          {filtered.length === 0 ? (
            <div className="empty-card">
              <span>◎</span>
              <strong>No memories yet</strong>
              <p>Add something you want MYRA to remember.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div className="memory-card" key={item.id}>
                <div>
                  <strong>{item.text}</strong>
                  <small>{item.time}</small>
                </div>

                <button onClick={() => deleteMemory(item.id)}>×</button>
              </div>
            ))
          )}
        </div>
      </section>
    );
  };

  const renderSettingsHome = () => (
    <section className="screen">
      {renderHeader("Settings")}

      <div className="page-title compact-title">
        <span>MYRA CONTROL</span>
        <h1>Settings</h1>
      </div>

      <div className="settings-list">
        <button onClick={() => setSettingsPage("key")}>
          <span>⌘</span>
          <div>
            <strong>AI Key & Provider</strong>
            <small>{apiKey ? "Gemini key configured" : "API key required"}</small>
          </div>
          <b>›</b>
        </button>

        <button onClick={() => setSettingsPage("memory")}>
          <span>🧠</span>
          <div>
            <strong>Memory</strong>
            <small>Import, export and local memories</small>
          </div>
          <b>›</b>
        </button>

        <button onClick={() => setSettingsPage("history")}>
          <span>◷</span>
          <div>
            <strong>History</strong>
            <small>{history.length} conversations</small>
          </div>
          <b>›</b>
        </button>

        <button onClick={() => setSettingsPage("language")}>
          <span>文</span>
          <div>
            <strong>Language</strong>
            <small>{language}</small>
          </div>
          <b>›</b>
        </button>

        <button onClick={() => setSettingsPage("voice")}>
          <span>♫</span>
          <div>
            <strong>Voice & Hey MYRA</strong>
            <small>{voiceEnabled ? "Voice enabled" : "Voice disabled"}</small>
          </div>
          <b>›</b>
        </button>

        <button onClick={() => setSettingsPage("permissions")}>
          <span>⌁</span>
          <div>
            <strong>Permissions</strong>
            <small>Microphone and device access</small>
          </div>
          <b>›</b>
        </button>

        <button onClick={() => setSettingsPage("google")}>
          <span>G</span>
          <div>
            <strong>Google Sign-In</strong>
            <small>Account connection setup</small>
          </div>
          <b>›</b>
        </button>
      </div>

      <div className="settings-footer">
        <strong>MYRA AI</strong>
        <span>Version 1.0</span>
      </div>
    </section>
  );

  const renderKeySettings = () => (
    <section className="screen">
      {renderHeader("AI Key", true)}

      <div className="page-title compact-title">
        <span>AI CONNECTION</span>
        <h1>AI Key</h1>
        <p>Connect MYRA to Gemini.</p>
      </div>

      <div className="setting-card">
        <label>Gemini API Key</label>

        <input
          className="key-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your Gemini API key"
        />

        <small>
          The key is saved locally in this app for this device.
        </small>
      </div>

      <div className="setting-card">
        <label>Provider</label>

        <div className="provider-grid">
          {["Gemini", "OpenAI", "xAI Grok", "OpenRouter"].map((item) => (
            <button
              key={item}
              className={provider === item ? "selected" : ""}
              onClick={() => setProvider(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-card">
        <label>Optional tools</label>

        <input placeholder="Tavily API key (optional)" />
        <input placeholder="Firecrawl API key (optional)" />
      </div>

      <p className="note">
        For a production app, keep API keys on a secure backend instead of
        shipping them inside the APK.
      </p>
    </section>
  );

  const renderMemorySettings = () => (
    <section className="screen">
      {renderHeader("Memory", true)}

      <div className="page-title compact-title">
        <span>LOCAL DATA</span>
        <h1>Memory</h1>
        <p>Manage your MYRA memory data.</p>
      </div>

      <div className="big-action" onClick={exportMemory}>
        <span>↑</span>
        <div>
          <strong>Export Memory</strong>
          <small>Save your memories as JSON</small>
        </div>
      </div>

      <label className="big-action">
        <span>↓</span>
        <div>
          <strong>Import Memory</strong>
          <small>Restore a MYRA JSON memory file</small>
        </div>
        <input
          type="file"
          accept=".json,application/json"
          onChange={importMemory}
          hidden
        />
      </label>
    </section>
  );

  const renderHistorySettings = () => {
    const filtered = history.filter((item) =>
      `${item.text} ${item.answer}`
        .toLowerCase()
        .includes(historySearch.toLowerCase())
    );

    return (
      <section className="screen">
        {renderHeader("History", true)}

        <div className="page-title compact-title">
          <span>CONVERSATIONS</span>
          <h1>History</h1>
        </div>

        <div className="search-box">
          🔎
          <input
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search history..."
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-card">
            <span>◷</span>
            <strong>No history</strong>
            <p>Your MYRA conversations will appear here.</p>
          </div>
        ) : (
          <div className="history-list">
            {filtered.map((item) => (
              <div className="history-card" key={item.id}>
                <strong>{item.text}</strong>
                <small>{item.time}</small>
                <span>{item.turns} turns</span>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <button className="danger-btn" onClick={clearHistory}>
            Delete all history
          </button>
        )}
      </section>
    );
  };

  const renderLanguageSettings = () => (
    <section className="screen">
      {renderHeader("Language", true)}

      <div className="page-title compact-title">
        <span>LANGUAGE</span>
        <h1>Language</h1>
        <p>Choose how MYRA should communicate.</p>
      </div>

      <div className="language-pills">
        {["Follow phone", "English", "Bangla"].map((item) => (
          <button
            key={item}
            className={language === item ? "selected" : ""}
            onClick={() => setLanguage(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="note">
        Follow phone uses your device/browser language when available.
      </p>
    </section>
  );

  const renderVoiceSettings = () => (
    <section className="screen">
      {renderHeader("Voice", true)}

      <div className="page-title compact-title">
        <span>VOICE CONTROL</span>
        <h1>Voice</h1>
      </div>

      <div className="toggle-card">
        <div>
          <strong>Voice replies</strong>
          <small>MYRA speaks AI responses.</small>
        </div>

        <button
          className={`switch ${voiceEnabled ? "on" : ""}`}
          onClick={() => setVoiceEnabled((v) => !v)}
        >
          <span />
        </button>
      </div>

      <div className="toggle-card">
        <div>
          <strong>Hey MYRA</strong>
          <small>Wake-word setting.</small>
        </div>

        <button
          className={`switch ${heyMyra ? "on" : ""}`}
          onClick={() => setHeyMyra((v) => !v)}
        >
          <span />
        </button>
      </div>

      <button
        className="wide-button"
        onClick={() => speak("Hello. I am MYRA AI.")}
      >
        ▶ Test MYRA voice
      </button>

      <p className="note">
        Background wake-word listening requires native Android support and is
        not enabled by this web-only layer.
      </p>
    </section>
  );

  const renderPermissions = () => (
    <section className="screen">
      {renderHeader("Permissions", true)}

      <div className="page-title compact-title">
        <span>DEVICE ACCESS</span>
        <h1>Permissions</h1>
        <p>Check features that may require Android permissions.</p>
      </div>

      <div className="permission-card">
        <span>🎙</span>
        <div>
          <strong>Microphone</strong>
          <small>Required for voice recognition.</small>
        </div>
        <button onClick={startVoice}>Test</button>
      </div>

      <div className="permission-card">
        <span>📞</span>
        <div>
          <strong>Phone</strong>
          <small>Calling features can open the phone dialer.</small>
        </div>
        <button
          onClick={() => {
            window.location.href = "tel:";
          }}
        >
          Open
        </button>
      </div>

      <p className="note">
        Android system permissions must also be declared in the native
        Capacitor project.
      </p>
    </section>
  );

  const renderGoogle = () => (
    <section className="screen">
      {renderHeader("Google", true)}

      <div className="page-title compact-title">
        <span>ACCOUNT</span>
        <h1>Google Sign-In</h1>
        <p>Connect a Google account to MYRA.</p>
      </div>

      <div className="google-card">
        <div className="google-logo">G</div>
        <strong>Google Account</strong>
        <small>
          Real Google authentication requires Firebase/Google OAuth
          configuration.
        </small>

        <button
          onClick={() =>
            alert(
              "Google Sign-In needs Firebase/OAuth configuration before it can be connected."
            )
          }
        >
          Configure Google Sign-In
        </button>
      </div>
    </section>
  );

  const renderSettingsPage = () => {
    switch (settingsPage) {
      case "key":
        return renderKeySettings();
      case "memory":
        return renderMemorySettings();
      case "history":
        return renderHistorySettings();
      case "language":
        return renderLanguageSettings();
      case "voice":
        return renderVoiceSettings();
      case "permissions":
        return renderPermissions();
      case "google":
        return renderGoogle();
      default:
        return renderSettingsHome();
    }
  };

  return (
    <main className="myra-app">
      <div className="app-shell">
        {tab === "myra" && renderMyra()}
        {tab === "today" && renderToday()}
        {tab === "memory" && renderMemory()}
        {tab === "settings" && renderSettingsPage()}

        <nav className="bottom-nav">
          <button
            className={tab === "myra" ? "active" : ""}
            onClick={() => {
              setTab("myra");
              setSettingsPage(null);
            }}
          >
            <span>◉</span>
            <small>MYRA</small>
          </button>

          <button
            className={tab === "today" ? "active" : ""}
            onClick={() => {
              setTab("today");
              setSettingsPage(null);
            }}
          >
            <span>▣</span>
            <small>Today</small>
          </button>

          <button
            className={tab === "memory" ? "active" : ""}
            onClick={() => {
              setTab("memory");
              setSettingsPage(null);
            }}
          >
            <span>♢</span>
            <small>Memory</small>
          </button>

          <button
            className={tab === "settings" ? "active" : ""}
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
