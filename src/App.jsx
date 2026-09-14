import React, { useEffect, useRef, useState } from "react";

const GEMINI_MODEL = "gemini-2.5-flash";

function App() {
  const [tab, setTab] = useState("home");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [wakeListening, setWakeListening] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(
    () => localStorage.getItem("myra_wake_enabled") !== "false"
  );

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

  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState(
    () => Number(localStorage.getItem("myra_voice_profile") || "1")
  );

  const [previewingVoice, setPreviewingVoice] = useState("");

  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeRecognitionRef = useRef(null);
  const shouldKeepWakeListeningRef = useRef(false);

  /* =========================================================
     INPUT
  ========================================================= */

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  /* =========================================================
     SAVE SETTINGS
  ========================================================= */

  useEffect(() => {
    localStorage.setItem("myra_voice_enabled", String(voice));
  }, [voice]);

  useEffect(() => {
    localStorage.setItem("myra_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(
      "myra_wake_enabled",
      String(wakeEnabled)
    );
  }, [wakeEnabled]);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem(
        "myra_selected_voice",
        selectedVoiceName
      );
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    localStorage.setItem(
      "myra_voice_profile",
      String(selectedVoiceProfile)
    );
  }, [selectedVoiceProfile]);

  /* =========================================================
     TTS VOICES
  ========================================================= */

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

  /* =========================================================
     VOICE PROFILES
  ========================================================= */

  const getVoiceSettings = (profile) => {
    const profiles = {
      1: { rate: 0.95, pitch: 1.05 },
      2: { rate: 0.9, pitch: 1.12 },
      3: { rate: 1.0, pitch: 1.0 },
      4: { rate: 0.88, pitch: 1.18 },
      5: { rate: 1.05, pitch: 1.08 },
      6: { rate: 0.93, pitch: 1.22 },
      7: { rate: 1.02, pitch: 1.15 },
    };

    return profiles[profile] || profiles[1];
  };

  const getSelectedVoice = () => {
    if (!("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();

    if (!voices.length) {
      return null;
    }

    if (selectedVoiceName) {
      const selected = voices.find(
        (item) => item.name === selectedVoiceName
      );

      if (selected) {
        return selected;
      }
    }

    if (ttsVoices.length) {
      const index =
        Math.max(1, Math.min(7, selectedVoiceProfile)) - 1;

      return ttsVoices[index] || ttsVoices[0];
    }

    return null;
  };

  /* =========================================================
     TEXT TO SPEECH
  ========================================================= */

  const speak = (text) => {
    if (
      !voice ||
      !("speechSynthesis" in window) ||
      !text
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      const selected = getSelectedVoice();
      const settings =
        getVoiceSettings(selectedVoiceProfile);

      utterance.lang =
        language === "Bangla"
          ? "bn-BD"
          : "en-US";

      if (selected) {
        utterance.voice = selected;
        utterance.lang = selected.lang;
      }

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      utterance.onend = () => {
        setPreviewingVoice("");
      };

      utterance.onerror = () => {
        setPreviewingVoice("");
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Speech error:", error);
    }
  };

  /* =========================================================
     VOICE PREVIEW
  ========================================================= */

  const previewVoice = (voiceItem, profileNumber) => {
    if (!("speechSynthesis" in window)) {
      alert(
        "Text-to-speech is not supported on this device."
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const key =
        `${voiceItem?.name || "profile"}-${profileNumber}`;

      setPreviewingVoice(key);

      const text =
        language === "Bangla"
          ? "হ্যালো, আমি মাইরা।"
          : "Hello, I'm Myra. How can I help you?";

      const utterance =
        new SpeechSynthesisUtterance(text);

      if (voiceItem) {
        utterance.voice = voiceItem;
        utterance.lang = voiceItem.lang;
      } else {
        utterance.lang =
          language === "Bangla"
            ? "bn-BD"
            : "en-US";
      }

      const settings =
        getVoiceSettings(profileNumber);

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      utterance.onend = () => {
        setPreviewingVoice("");
      };

      utterance.onerror = () => {
        setPreviewingVoice("");
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Voice preview error:", error);
      setPreviewingVoice("");
    }
  };

  /* =========================================================
     SELECT VOICE
  ========================================================= */

  const selectVoice = (voiceItem, profileNumber) => {
    try {
      window.speechSynthesis?.cancel();
    } catch (e) {}

    setSelectedVoiceProfile(profileNumber);

    if (voiceItem) {
      setSelectedVoiceName(voiceItem.name);
    }

    const text =
      language === "Bangla"
        ? "হ্যালো, আমি মাইরা।"
        : "Hello, I'm Myra.";

    try {
      const utterance =
        new SpeechSynthesisUtterance(text);

      if (voiceItem) {
        utterance.voice = voiceItem;
        utterance.lang = voiceItem.lang;
      } else {
        utterance.lang =
          language === "Bangla"
            ? "bn-BD"
            : "en-US";
      }

      const settings =
        getVoiceSettings(profileNumber);

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      window.speechSynthesis.speak(utterance);
    } catch (e) {}

    alert(
      `MYRA Woman Voice ${profileNumber} selected.`
    );
  };

  /* =========================================================
     MICROPHONE
     ========================================================= */

  const checkMicrophoneSupport = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice recognition is not supported on this device."
      );
      return false;
    }

    return true;
  };

  const startListening = async () => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      return;
    }

    if (!checkMicrophoneSupport()) {
      return;
    }

    try {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

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
          event.error === "service-not-allowed"
        ) {
          alert(
            "Microphone permission is not allowed.\n\n" +
            "Android Settings → Apps → MYRA AI → Permissions → Microphone → Allow."
          );
        }

        if (event.error === "audio-capture") {
          alert(
            "Microphone could not be accessed.\n\n" +
            "Please check Android microphone permission."
          );
        }
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
        focusInput();
      };

      recognitionRef.current = recognition;

      recognition.start();
    } catch (error) {
      console.error("Voice start error:", error);
      setListening(false);
    }
  };

  /* =========================================================
     HEY MYRA WAKE WORD
  ========================================================= */

  const stopWakeWord = () => {
    shouldKeepWakeListeningRef.current = false;

    try {
      wakeRecognitionRef.current?.stop();
    } catch (e) {}

    wakeRecognitionRef.current = null;
    setWakeListening(false);
  };

  const startWakeWord = () => {
    if (!wakeEnabled) {
      return;
    }

    if (!checkMicrophoneSupport()) {
      return;
    }

    if (shouldKeepWakeListeningRef.current) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    shouldKeepWakeListeningRef.current = true;

    const createWakeRecognition = () => {
      if (!shouldKeepWakeListeningRef.current) {
        return;
      }

      try {
        const recognition =
          new SpeechRecognition();

        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setWakeListening(true);
        };

        recognition.onresult = (event) => {
          let transcript = "";

          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {
            transcript +=
              event.results[i][0]?.transcript || "";
          }

          const lower =
            transcript.toLowerCase().trim();

          const wakeDetected =
            lower.includes("hey myra") ||
            lower.includes("hey mira");

          if (wakeDetected) {
            try {
              recognition.stop();
            } catch (e) {}

            shouldKeepWakeListeningRef.current = false;
            setWakeListening(false);

            setTimeout(() => {
              startListening();
            }, 250);
          }
        };

        recognition.onerror = (event) => {
          console.warn(
            "Wake word error:",
            event.error
          );

          if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
          ) {
            shouldKeepWakeListeningRef.current = false;
            setWakeListening(false);

            alert(
              "Microphone permission is required for Hey Myra.\n\n" +
              "Android Settings → Apps → MYRA AI → Permissions → Microphone → Allow."
            );
          }
        };

        recognition.onend = () => {
          wakeRecognitionRef.current = null;

          if (
            shouldKeepWakeListeningRef.current &&
            wakeEnabled
          ) {
            setTimeout(() => {
              createWakeRecognition();
            }, 500);
          } else {
            setWakeListening(false);
          }
        };

        wakeRecognitionRef.current = recognition;
        recognition.start();
      } catch (error) {
        console.error(
          "Wake word start error:",
          error
        );

        wakeRecognitionRef.current = null;
        setWakeListening(false);

        if (shouldKeepWakeListeningRef.current) {
          setTimeout(() => {
            createWakeRecognition();
          }, 1000);
        }
      }
    };

    createWakeRecognition();
  };

  /* =========================================================
     START HEY MYRA WHEN APP OPENS
  ========================================================= */

  useEffect(() => {
    if (!wakeEnabled) {
      stopWakeWord();
      return;
    }

    const timer = setTimeout(() => {
      startWakeWord();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [wakeEnabled]);

  /* =========================================================
     APP WAKE EVENT
     ========================================================= */

  useEffect(() => {
    const handleMyraWake = () => {
      stopWakeWord();

      setTimeout(() => {
        startListening();
      }, 250);
    };

    window.addEventListener(
      "myra-wake",
      handleMyraWake
    );

    return () => {
      window.removeEventListener(
        "myra-wake",
        handleMyraWake
      );
    };
  }, [language, listening]);

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      try {
        wakeRecognitionRef.current?.stop();
      } catch (e) {}

      try {
        window.speechSynthesis?.cancel();
      } catch (e) {}

      shouldKeepWakeListeningRef.current = false;
    };
  }, []);

  /* =========================================================
     PHONE CALL
  ========================================================= */

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
      `tel:${encodeURIComponent(cleanNumber)}`;
  };

  /* =========================================================
     MESSAGES
  ========================================================= */

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

  /* =========================================================
     COMMANDS
  ========================================================= */

  const processCommand = (command) => {
    const text = command.trim();
    const lower = text.toLowerCase();

    /* CALL */

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

    /* SMS */

    if (
      lower.startsWith("sms ") ||
      lower.startsWith("send sms ") ||
      lower.startsWith("message ") ||
      lower.startsWith("মেসেজ ") ||
      lower.startsWith("এসএমএস ")
    ) {
      addAssistant(
        "I can help you prepare the message. Open your Messages app, review it, and press Send yourself."
      );

      return true;
    }

    return false;
  };

  /* =========================================================
     GEMINI
  ========================================================= */

  const getGeminiUrl = () => {
    return (
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent`
    );
  };

  const sendMessage = async (customText = null) => {
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
        language === "Bangla"
          ? "Gemini এখনো connected নয়। Settings থেকে Gemini API key যোগ করুন।"
          : "Gemini is not connected yet. Open Settings and add your Gemini API key."
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
        }\n\nCheck your API key and internet connection.`
      );
    } finally {
      setThinking(false);
      focusInput();
    }
  };

  /* =========================================================
     QUICK ACTIONS
  ========================================================= */

  const quickAsk = (text) => {
    setTab("chat");

    setTimeout(() => {
      sendMessage(text);
    }, 120);
  };

  /* =========================================================
     API SETTINGS
  ========================================================= */

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

  /* =========================================================
     HOME
  ========================================================= */

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

        <div className="connection-status hero-status">

          <span
            className={
              wakeListening
                ? "status-blue"
                : "status-off"
            }
          />

          {wakeListening
            ? "Hey Myra is listening"
            : "Hey Myra is off"}

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

  /* =========================================================
     CHAT
  ========================================================= */

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

  /* =========================================================
     SETTINGS
  ========================================================= */

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

          <div className="toggle-card">

            <span>
              Hey Myra wake word
            </span>

            <label className="switch">

              <input
                type="checkbox"
                checked={wakeEnabled}
                onChange={(e) => {
                  const enabled =
                    e.target.checked;

                  setWakeEnabled(enabled);

                  if (!enabled) {
                    stopWakeWord();
                  } else {
                    setTimeout(
                      startWakeWord,
                      300
                    );
                  }
                }}
              />

              <span />

            </label>

          </div>

          <div className="note">
            Say "Hey Myra" while MYRA is open to start voice listening.
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

          <div className="voice-list">

            {Array.from({ length: 7 }).map(
              (_, index) => {

                const profileNumber =
                  index + 1;

                const voiceItem =
                  ttsVoices[index] || null;

                const selected =
                  selectedVoiceProfile ===
                  profileNumber;

                const previewKey =
                  `${voiceItem?.name || "profile"}-${profileNumber}`;

                const previewing =
                  previewingVoice ===
                  previewKey;

                return (

                  <div
                    key={profileNumber}
                    className={
                      selected
                        ? "voice-option selected"
                        : "voice-option"
                    }
                  >

                    <div className="voice-info">

                      <div className="voice-number">
                        {profileNumber}
                      </div>

                      <div>

                        <div className="voice-name">
                          Woman Voice {profileNumber}
                        </div>

                        <div className="voice-language">

                          {voiceItem
                            ? `${voiceItem.lang} • ${voiceItem.name}`
                            : "Android TTS profile"}

                        </div>

                      </div>

                    </div>

                    <div className="voice-actions">

                      <button
                        className="preview-button"
                        onClick={() =>
                          previewVoice(
                            voiceItem,
                            profileNumber
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
                            voiceItem,
                            profileNumber
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

          <button
            className="connect-button"
            onClick={loadVoices}
          >
            🔄 Refresh Voices
          </button>

          <div className="note">
            MYRA uses voices available from your Android Text-to-Speech engine.
            The 7 profiles adjust voice style, pitch and speed.
          </div>

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

  /* =========================================================
     SCREEN
  ========================================================= */

  const renderScreen = () => {

    if (tab === "settings") {
      return renderSettings();
    }

    if (tab === "chat") {
      return renderChat();
    }

    return renderHome();
  };

  /* =========================================================
     APP
  ========================================================= */

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
