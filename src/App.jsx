import React, { useEffect, useRef, useState } from "react";
import { registerPlugin } from "@capacitor/core";

const GEMINI_MODEL = "gemini-3.6-flash";
const MyraNative = registerPlugin("MyraNative");

function App() {
  const [tab, setTab] = useState("home");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm Myra. How can I help you today?",
    },
  ]);

  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("myra_gemini_key") || ""
  );

  const [connected, setConnected] = useState(
    () => Boolean(localStorage.getItem("myra_gemini_key"))
  );

  const [voice, setVoice] = useState(
    () => localStorage.getItem("myra_voice_enabled") !== "false"
  );

  const [language, setLanguage] = useState(
    () => localStorage.getItem("myra_language") || "English"
  );

  const [ttsVoices, setTtsVoices] = useState([]);

  const [selectedVoiceName, setSelectedVoiceName] = useState(
    () => localStorage.getItem("myra_selected_voice") || ""
  );

  const [previewingVoice, setPreviewingVoice] = useState("");

  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  /* ---------------- VOICE LIST ---------------- */

  const loadVoices = () => {
    if (!("speechSynthesis" in window)) {
      setTtsVoices([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();

    if (!voices.length) {
      setTtsVoices([]);
      return;
    }

    const preferredFemaleNames = [
      "female",
      "woman",
      "zira",
      "samantha",
      "karen",
      "moira",
      "susan",
      "ava",
      "allison",
      "victoria",
      "aria",
      "jenny",
      "sara",
      "ana",
      "google us english female",
      "google uk english female",
      "microsoft zira",
      "microsoft aria",
      "microsoft jenny",
      "microsoft sara",
      "microsoft ana",
    ];

    const femaleDetected = voices.filter((v) => {
      const name = (v.name || "").toLowerCase();

      return preferredFemaleNames.some((keyword) =>
        name.includes(keyword)
      );
    });

    const englishVoices = voices.filter((v) =>
      /^en(-|_)/i.test(v.lang || "")
    );

    const banglaVoices = voices.filter((v) =>
      /^bn(-|_)/i.test(v.lang || "")
    );

    let candidates = [
      ...femaleDetected,
      ...englishVoices,
      ...banglaVoices,
    ];

    const unique = [];
    const seen = new Set();

    for (const item of candidates) {
      const key = `${item.name}__${item.lang}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    const maleNames = [
      "david",
      "mark",
      "george",
      "daniel",
      "james",
      "fred",
      "thomas",
      "richard",
    ];

    const filtered = unique.filter((item) => {
      const name = (item.name || "").toLowerCase();

      return !maleNames.some(
        (male) =>
          name === male ||
          name.startsWith(`${male} `) ||
          name.includes(` ${male} `)
      );
    });

    setTtsVoices(filtered.slice(0, 7));
  };

  useEffect(() => {
    loadVoices();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "myra_voice_enabled",
      String(voice)
    );
  }, [voice]);

  useEffect(() => {
    localStorage.setItem(
      "myra_language",
      language
    );
  }, [language]);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem(
        "myra_selected_voice",
        selectedVoiceName
      );
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      try {
        window.speechSynthesis?.cancel();
      } catch (e) {}
    };
  }, []);

  /* ---------------- INPUT ---------------- */

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  /* ---------------- MICROPHONE ---------------- */

  const requestMicrophonePermission = async () => {
    try {
      /*
       * Check native Android permission state.
       * We DO NOT stop here when granted is false.
       *
       * getUserMedia() below is responsible for triggering
       * the Android WebView microphone permission request.
       */
      try {
        await MyraNative.requestPermission({
          permission: "RECORD_AUDIO",
        });
      } catch (nativeError) {
        console.warn(
          "Native microphone check:",
          nativeError
        );
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        alert(
          "Microphone is not supported on this device."
        );

        return false;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      stream.getTracks().forEach((track) => {
        track.stop();
      });

      return true;
    } catch (error) {
      console.error(
        "Microphone permission error:",
        error
      );

      alert(
        "Microphone permission is blocked.\n\n" +
          "Open Android Settings → Apps → MYRA AI → Permissions → Microphone → Allow."
      );

      return false;
    }
  };

  /* ---------------- TEXT TO SPEECH ---------------- */

  const getSelectedVoice = () => {
    if (!("speechSynthesis" in window)) {
      return null;
    }

    if (!selectedVoiceName) {
      return null;
    }

    const voices =
      window.speechSynthesis.getVoices();

    return (
      voices.find(
        (item) => item.name === selectedVoiceName
      ) || null
    );
  };

  const speak = (text) => {
    if (
      !voice ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.lang =
        language === "Bangla"
          ? "bn-BD"
          : "en-US";

      const selected =
        getSelectedVoice();

      if (selected) {
        utterance.voice = selected;
        utterance.lang = selected.lang;
      }

      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onend = () => {
        setPreviewingVoice("");
      };

      utterance.onerror = () => {
        setPreviewingVoice("");
      };

      window.speechSynthesis.speak(
        utterance
      );
    } catch (error) {
      console.error(
        "Speech error:",
        error
      );
    }
  };

  const previewVoice = (voiceItem) => {
    if (!("speechSynthesis" in window)) {
      alert(
        "Text-to-speech is not supported on this device."
      );

      return;
    }

    try {
      window.speechSynthesis.cancel();

      setPreviewingVoice(
        voiceItem.name
      );

      const text =
        language === "Bangla"
          ? "হ্যালো, আমি মাইরা।"
          : "Hello, I'm Myra. How can I help you?";

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.voice = voiceItem;
      utterance.lang = voiceItem.lang;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onend = () => {
        setPreviewingVoice("");
      };

      utterance.onerror = () => {
        setPreviewingVoice("");
      };

      window.speechSynthesis.speak(
        utterance
      );
    } catch (error) {
      console.error(
        "Voice preview error:",
        error
      );

      setPreviewingVoice("");
    }
  };

  const selectVoice = (voiceItem) => {
    try {
      window.speechSynthesis?.cancel();
    } catch (e) {}

    setSelectedVoiceName(
      voiceItem.name
    );

    const testText =
      language === "Bangla"
        ? "হ্যালো, আমি মাইরা।"
        : "Hello, I'm Myra.";

    try {
      const utterance =
        new SpeechSynthesisUtterance(
          testText
        );

      utterance.voice = voiceItem;
      utterance.lang = voiceItem.lang;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      window.speechSynthesis.speak(
        utterance
      );
    } catch (e) {}

    alert(
      `MYRA voice selected:\n${voiceItem.name}`
    );
  };

  /* ---------------- SPEECH RECOGNITION ---------------- */

  const startListening = async () => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      return;
    }

    const allowed =
      await requestMicrophonePermission();

    if (!allowed) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice recognition is not supported on this device."
      );

      return;
    }

    try {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      const recognition =
        new SpeechRecognition();

      recognition.lang =
        language === "Bangla"
          ? "bn-BD"
          : "en-US";

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onresult = (event) => {
        const text =
          event?.results?.[0]?.[0]
            ?.transcript || "";

        if (text.trim()) {
          setInput(text.trim());
          focusInput();
        }
      };

      recognition.onerror = (event) => {
        console.error(
          "Speech recognition error:",
          event.error
        );

        setListening(false);

        if (
          event.error === "not-allowed" ||
          event.error ===
            "service-not-allowed"
        ) {
          alert(
            "Microphone permission was denied.\n\n" +
              "Android Settings → Apps → MYRA AI → Permissions → Microphone → Allow"
          );
        }
      };

      recognition.onend = () => {
        setListening(false);
        focusInput();
      };

      recognitionRef.current =
        recognition;

      recognition.start();
    } catch (error) {
      console.error(
        "Voice start error:",
        error
      );

      setListening(false);
    }
  };

  /* ---------------- PHONE ---------------- */

  const makeCall = (number) => {
    const cleanNumber =
      String(number || "").replace(
        /[^0-9+]/g,
        ""
      );

    if (!cleanNumber) {
      alert(
        "Please provide a valid phone number."
      );

      return;
    }

    window.location.href =
      `tel:${encodeURIComponent(
        cleanNumber
      )}`;
  };

  /* ---------------- MESSAGES ---------------- */

  const addUser = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
      },
    ]);
  };

  const addAssistant = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text,
      },
    ]);

    speak(text);
  };

  /* ---------------- COMMANDS ---------------- */

  const processCommand = (command) => {
    const text = command.trim();
    const lower = text.toLowerCase();

    if (
      lower.startsWith("call ") ||
      lower.startsWith("কল ") ||
      lower.startsWith("phone ") ||
      lower.startsWith("ফোন ")
    ) {
      const number =
        text.replace(
          /^(call|কল|phone|ফোন)\s*/i,
          ""
        );

      if (/[0-9+]{6,}/.test(number)) {
        makeCall(number);

        addAssistant(
          "Opening the phone dialer for you."
        );
      } else {
        addAssistant(
          "Please give me a valid phone number."
        );
      }

      return true;
    }

    if (
      lower.startsWith("sms ") ||
      lower.startsWith("send sms ") ||
      lower.startsWith("message ") ||
      lower.startsWith("মেসেজ ") ||
      lower.startsWith("এসএমএস ")
    ) {
      addAssistant(
        "I can open your Messages app. You can review the message and press Send yourself."
      );

      return true;
    }

    return false;
  };

  /* ---------------- GEMINI ---------------- */

  const getGeminiUrl = () => {
    return (
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent`
    );
  };

  const sendMessage = async (
    customText = null
  ) => {
    const text = (
      customText !== null
        ? customText
        : input
    ).trim();

    if (!text || thinking) {
      return;
    }

    setInput("");

    addUser(text);

    const handled =
      processCommand(text);

    if (handled) {
      focusInput();
      return;
    }

    const key =
      localStorage.getItem(
        "myra_gemini_key"
      ) ||
      apiKey.trim();

    if (!key) {
      addAssistant(
        "Gemini is not connected yet. Open Settings and add your Gemini API key."
      );

      focusInput();
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
      ];

      const contents =
        recentMessages
          .slice(-12)
          .map((message) => ({
            role:
              message.role === "user"
                ? "user"
                : "model",

            parts: [
              {
                text: message.text,
              },
            ],
          }));

      const response =
        await fetch(
          `${getGeminiUrl()}?key=${encodeURIComponent(
            key
          )}`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      "You are MYRA, a helpful AI assistant. " +
                      "If the user speaks Bangla, reply naturally in Bangla. " +
                      "If the user speaks English, reply naturally in English. " +
                      "Be friendly, useful and concise unless more detail is requested.",
                  },
                ],
              },

              contents,

              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1200,
              },
            }),
          }
        );

      let data;

      try {
        data = await response.json();
      } catch (error) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            `Gemini request failed with HTTP ${response.status}.`
        );
      }

      const answer =
        data?.candidates?.[0]
          ?.content?.parts
          ?.map(
            (part) =>
              part.text || ""
          )
          .join("")
          .trim();

      if (!answer) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      setConnected(true);

      addAssistant(answer);
    } catch (error) {
      console.error(
        "Gemini error:",
        error
      );

      addAssistant(
        `Gemini connection failed.\n\n${
          error?.message ||
          "Unknown error."
        }\n\nCheck your API key, internet connection and Gemini API access.`
      );
    } finally {
      setThinking(false);
      focusInput();
    }
  };

  /* ---------------- QUICK ACTIONS ---------------- */

  const quickAsk = (text) => {
    setTab("chat");

    setTimeout(() => {
      sendMessage(text);
    }, 120);
  };

  /* ---------------- API SETTINGS ---------------- */

  const saveApiKey = () => {
    const key = apiKey.trim();

    if (!key) {
      localStorage.removeItem(
        "myra_gemini_key"
      );

      setConnected(false);

      alert(
        "Please paste your Gemini API key."
      );

      return;
    }

    localStorage.setItem(
      "myra_gemini_key",
      key
    );

    setApiKey(key);
    setConnected(true);

    alert(
      "Gemini API key saved successfully."
    );
  };

  const disconnectApi = () => {
    localStorage.removeItem(
      "myra_gemini_key"
    );

    setApiKey("");
    setConnected(false);

    alert(
      "Gemini API disconnected."
    );
  };

  /* ---------------- HOME ---------------- */

  const renderHome = () => (
    <div className="screen">

      <div className="myra-header">

        <div className="brand-small">
          <span className="brand-dot" />
          MYRA
        </div>

        <button
          className="icon-btn"
          onClick={() =>
            setTab("settings")
          }
        >
          ⚙
        </button>

      </div>

      <div className="hero-area">

        <div className="myra-orb">

          <div className="orb-ring" />

          <div className="orb-core">
            M
          </div>

        </div>

        <h1 className="greeting">
          Hello! I'm Myra
        </h1>

        <p>
          Your personal AI assistant
        </p>

        <div className="connection-status hero-status">

          <span
            className={
              connected
                ? "status-blue"
                : "status-off"
            }
          />

          {connected
            ? "AI Connected"
            : "AI Ready"}

        </div>

      </div>

      <div className="quick-row">

        <button
          className="command-action"
          onClick={() =>
            quickAsk(
              "Tell me something interesting."
            )
          }
        >
          ✨
          <span>Ask</span>
        </button>

        <button
          className="command-action"
          onClick={() =>
            quickAsk(
              language === "Bangla"
                ? "আজকের জন্য আমাকে একটি ভালো পরামর্শ দাও।"
                : "Give me a useful tip for today."
            )
          }
        >
          💡
          <span>Tips</span>
        </button>

        <button
          className="command-action"
          onClick={startListening}
        >
          🎤
          <span>
            {listening
              ? "Listening"
              : "Voice"}
          </span>
        </button>

      </div>

      <div className="compact-chat">

        {messages
          .slice(-4)
          .map(
            (message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "mini-message user-mini"
                    : "mini-message ai-mini"
                }
              >

                <span>
                  {message.role === "user"
                    ? "You"
                    : "Myra"}
                </span>

                <p>
                  {message.text}
                </p>

              </div>
            )
          )}

      </div>

      <div className="voice-control">

        <button
          className={
            listening
              ? "voice-button listening"
              : "voice-button"
          }
          onClick={startListening}
        >
          {listening ? "●" : "🎙️"}
        </button>

      </div>

      <div className="text-input-wrap">

        <input
          ref={inputRef}
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
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
          placeholder={
            listening
              ? "Listening..."
              : "Ask Myra anything..."
          }
          autoComplete="off"
          autoCorrect="on"
          spellCheck={true}
        />

        <button
          onClick={() =>
            sendMessage()
          }
          disabled={
            thinking ||
            !input.trim()
          }
        >
          ➤
        </button>

      </div>

    </div>
  );

  /* ---------------- CHAT ---------------- */

  const renderChat = () => (
    <div className="screen chat-screen">

      <div className="myra-header">

        <div className="brand-small">
          <span className="brand-dot" />
          MYRA CHAT
        </div>

        <button
          className="icon-btn"
          onClick={() =>
            setMessages([
              {
                role: "assistant",
                text:
                  "Hello! I'm Myra. How can I help you today?",
              },
            ])
          }
        >
          🗑
        </button>

      </div>

      <div className="chat-messages">

        {messages.map(
          (message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "chat-bubble user-bubble"
                  : "chat-bubble ai-bubble"
              }
            >

              <div className="bubble-name">
                {message.role === "user"
                  ? "You"
                  : "Myra"}
              </div>

              <div className="bubble-text">
                {message.text}
              </div>

            </div>
          )
        )}

        {thinking && (
          <div className="chat-bubble ai-bubble thinking">
            Myra is thinking...
          </div>
        )}

      </div>

      <div className="text-input-wrap chat-input">

        <button
          className="mic-mini"
          onClick={startListening}
        >
          🎤
        </button>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
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
          placeholder={
            listening
              ? "Listening..."
              : "Message Myra..."
          }
          autoComplete="off"
          autoCorrect="on"
          spellCheck={true}
        />

        <button
          onClick={() =>
            sendMessage()
          }
          disabled={
            thinking ||
            !input.trim()
          }
        >
          ➤
        </button>

      </div>

    </div>
  );

  /* ---------------- SETTINGS ---------------- */

  const renderSettings = () => (
    <div className="screen settings-screen">

      <div className="myra-header">

        <button
          className="icon-btn"
          onClick={() =>
            setTab("home")
          }
        >
          ←
        </button>

        <div className="brand-small">
          <span className="brand-dot" />
          MYRA
        </div>

        <div />

      </div>

      <div className="settings-content">

        <h1>
          Settings
        </h1>

        <p className="settings-subtitle">
          Customize your MYRA AI assistant
        </p>

        {/* GEMINI */}

        <div className="setting-card">

          <div className="setting-title">
            Gemini AI
          </div>

          <div className="setting-description">
            Add your Gemini API key to connect MYRA with AI.
          </div>

          <input
            className="setting-input"
            type="password"
            value={apiKey}
            onChange={(e) =>
              setApiKey(e.target.value)
            }
            placeholder="Paste Gemini API key"
            autoComplete="off"
          />

          <div className="connection-status">

            <span
              className={
                connected
                  ? "status-blue"
                  : "status-off"
              }
            />

            {connected
              ? "Gemini connected"
              : "Gemini not connected"}

          </div>

          <button
            className="connect-button"
            onClick={saveApiKey}
          >
            Save & Connect
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

        {/* VOICE */}

        <div className="setting-card">

          <div className="setting-title">
            🎤 Voice
          </div>

          <div className="toggle-card">

            <span>
              Voice replies
            </span>

            <label className="switch">

              <input
                type="checkbox"
                checked={voice}
                onChange={(e) =>
                  setVoice(
                    e.target.checked
                  )
                }
              />

              <span />

            </label>

          </div>

        </div>

        {/* WOMAN VOICES */}

        <div className="setting-card">

          <div className="setting-title">
            👩 Woman Voice
          </div>

          <div className="setting-description">
            Choose the voice MYRA will use for spoken replies.
          </div>

          {ttsVoices.length === 0 ? (

            <div className="note">
              No compatible text-to-speech voices were found.
              Please enable or install voices in your Android
              Text-to-Speech settings.
            </div>

          ) : (

            <div className="voice-list">

              {ttsVoices.map(
                (voiceItem, index) => {

                  const selected =
                    selectedVoiceName ===
                    voiceItem.name;

                  const previewing =
                    previewingVoice ===
                    voiceItem.name;

                  return (

                    <div
                      key={`${voiceItem.name}-${voiceItem.lang}-${index}`}
                      className={
                        selected
                          ? "voice-option selected"
                          : "voice-option"
                      }
                    >

                      <div className="voice-info">

                        <div className="voice-number">
                          {index + 1}
                        </div>

                        <div>

                          <div className="voice-name">
                            Woman Voice {index + 1}
                          </div>

                          <div className="voice-language">
                            {voiceItem.lang} •{" "}
                            {voiceItem.name}
                          </div>

                        </div>

                      </div>

                      <div className="voice-actions">

                        <button
                          className="preview-button"
                          onClick={() =>
                            previewVoice(
                              voiceItem
                            )
                          }
                        >
                          {previewing
                            ? "■"
                            : "▶"}
                        </button>

                        <button
                          className={
                            selected
                              ? "select-button selected"
                              : "select-button"
                          }
                          onClick={() =>
                            selectVoice(
                              voiceItem
                            )
                          }
                        >
                          {selected
                            ? "Selected"
                            : "Select"}
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

          <button
            className="connect-button"
            onClick={loadVoices}
          >
            🔄 Refresh Voices
          </button>

        </div>

        {/* LANGUAGE */}

        <div className="setting-card">

          <div className="setting-title">
            🌐 Language
          </div>

          <div className="language-pills">

            <button
              className={
                language === "English"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setLanguage("English")
              }
            >
              English
            </button>

            <button
              className={
                language === "Bangla"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setLanguage("Bangla")
              }
            >
              বাংলা
            </button>

          </div>

        </div>

        {/* APP INFO */}

        <div className="setting-card">

          <div className="setting-title">
            📱 MYRA AI
          </div>

          <div className="setting-description">
            Version 1.0
          </div>

          <div className="note">
            MYRA AI Assistant
          </div>

        </div>

      </div>

    </div>
  );

  /* ---------------- SCREEN ---------------- */

  const renderScreen = () => {

    if (tab === "settings") {
      return renderSettings();
    }

    if (tab === "chat") {
      return renderChat();
    }

    return renderHome();
  };

  /* ---------------- APP ---------------- */

  return (
    <div className="myra-app">

      <div className="app-shell">

        {renderScreen()}

        <nav className="bottom-nav">

          <button
            className={
              tab === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("home")
            }
            aria-label="Home"
          >

            <span className="nav-icon">
              ⌂
            </span>

            <span>
              Home
            </span>

          </button>

          <button
            className={
              tab === "chat"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("chat")
            }
            aria-label="Chat"
          >

            <span className="nav-icon">
              ◉
            </span>

            <span>
              Chat
            </span>

          </button>

          <button
            className={
              tab === "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("settings")
            }
            aria-label="Settings"
          >

            <span className="nav-icon">
              ⚙
            </span>

            <span>
              Settings
            </span>

          </button>

        </nav>

      </div>

    </div>
  );
}

export default App;
