import { LLM } from "./llm.js/llm.js";

const MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0_5b-instruct-q4_0.gguf";

const TOPICS = [
  "a little dragon who is afraid of fire",
  "a brave rabbit who finds a lost star",
  "a friendly cloud who wants to make rain for the flowers",
  "a puppy who learns to share his toys",
  "a small fish who swims to the ocean for the first time",
  "a sleepy bear who cannot find the right cave to sleep in",
  "a kind robot who helps children cross the street",
  "a young owl who is scared of the dark",
  "a caterpillar who dreams of flying like a butterfly",
  "a tiny seed who grows into the tallest tree in the forest",
];

const BACKUP_PARAGRAPHS = [
  "Once there was a little dragon named Pip who was afraid of his own fire. Every time he sneezed, tiny flames shot out and he would hide behind a rock. One day a friend showed him how to roast marshmallows with his flames, and everyone cheered. From that day on, Pip knew his fire was something special.",
  "A brave rabbit named Rosie found a tiny star sitting on a leaf one evening. The star was lost and could not find its way back to the sky. Rosie hopped all the way to the top of the tallest hill and held the star up high. With a soft pop, the star zoomed back up and twinkled just for her.",
  "High above the hills, a friendly cloud named Cleo wanted to help the thirsty flowers below. She puffed herself up as big as she could and let the rain fall gently down. The flowers lifted their heads and smiled in the soft shower. Cleo floated away feeling warm and happy inside.",
  "Max the puppy had a basket full of toys, but he never let anyone play with them. One afternoon his friend Bella came over and sat quietly with nothing to do. Max looked at his toys, then at Bella, and pushed his favourite ball toward her. They played together all afternoon and Max discovered sharing was the most fun of all.",
  "A little fish named Finn had lived in a small pond his whole life. One morning he swam through a long tunnel and came out into the enormous blue ocean. Everything was bright and wide and full of colour. Finn took a deep breath of water and smiled because adventure had finally found him.",
  "A young owl named Oliver was afraid of the dark, which was a big problem because owls sleep in the day and wake at night. His mother showed him how the stars were tiny night lights sprinkled just for owls. Oliver looked up, saw a thousand glowing specks, and felt brave. He spread his wings and flew off into his first moonlit night.",
];

const startBtn = document.getElementById("startBtn");
const newParagraphBtn = document.getElementById("newParagraphBtn");
const pronounceBtn = document.getElementById("pronounceBtn");
const transcriptElement = document.getElementById("transcript");
const highlightedText = document.getElementById("highlighted-text");
const displayTextElement = document.getElementById("display-text");
const modelStatus = document.getElementById("model-status");

let words = [];
let wordCount = 0;
let highlightedIndex = 0;
let spokenIdx = 0;
let debugText = "";
let modelReady = false;
let llmEngine = null;
let usedBackupIndices = [];

function setStatus(msg, ok = null) {
  modelStatus.textContent = msg;
  modelStatus.style.color = ok === true ? "#4caf50" : ok === false ? "#e53935" : "#555";
}

function randomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

function fallbackParagraph() {
  if (usedBackupIndices.length === BACKUP_PARAGRAPHS.length) usedBackupIndices = [];
  const remaining = BACKUP_PARAGRAPHS
    .map((_, i) => i)
    .filter((i) => !usedBackupIndices.includes(i));
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  usedBackupIndices.push(pick);
  return BACKUP_PARAGRAPHS[pick];
}

function loadFallback(reason) {
  setStatus(`${reason} — showing offline text`, false);
  prepareText(fallbackParagraph());
  newParagraphBtn.disabled = false;
  startBtn.disabled = false;
}

const ASSISTANT_MARKER = "<|im_start|>assistant\n";

function buildPrompt(topic) {
  return `<|im_start|>user\nWrite a short children's story about ${topic}. Use simple words that a 6 to 8 year old can read. Write exactly 4 sentences. Make it fun, warm, and with a happy ending. Output only the story, no title, no extra text.<|im_end|>\n${ASSISTANT_MARKER}`;
}

function extractResponse(raw, prompt) {
  let text = raw;
  // Try full Qwen marker first, then bare "assistant" echo, then prompt prefix
  const fullMarkerIdx = text.lastIndexOf(ASSISTANT_MARKER);
  const bareMarkerIdx = text.lastIndexOf("assistant\n");
  if (fullMarkerIdx !== -1) {
    text = text.slice(fullMarkerIdx + ASSISTANT_MARKER.length);
  } else if (bareMarkerIdx !== -1) {
    text = text.slice(bareMarkerIdx + "assistant\n".length);
  } else if (text.startsWith(prompt)) {
    text = text.slice(prompt.length);
  }
  text = text.replace(/<\|im_end\|>[\s\S]*$/, "").trim();
  return limitToSentences(text, 4);
}

function limitToSentences(text, max) {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const matches = text.match(/[^.!?]*[.!?]+(\s|$)/g);
  if (!matches) return text;
  return matches.slice(0, max).join("").trim();
}

function prepareText(text) {
  displayTextElement.textContent = text;
  const clean = text
    .replace(/[^\w\s]|_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
  words = clean.split(" ");
  wordCount = words.length;
  highlightedIndex = 0;
  debugText = "";
  highlightedText.innerHTML = "";
  transcriptElement.textContent = "";
}

async function generateParagraph() {
  newParagraphBtn.disabled = true;
  startBtn.disabled = true;
  setStatus("Generating…");
  displayTextElement.textContent = "";

  const prompt = buildPrompt(randomTopic());
  let generated = "";

  try {
    await new Promise((resolve, reject) => {
      llmEngine.write_result_callback = (token) => {
        generated += token;
        // Show only the clean response while streaming
        const preview = extractResponse(generated, prompt);
        displayTextElement.textContent = preview || "";
      };

      llmEngine.on_complete_callback = () => {
        llmEngine.write_result_callback = () => {};
        llmEngine.on_complete_callback = () => {};
        resolve();
      };

      llmEngine.run({
        prompt,
        max_token_len: 200,
        top_k: 40,
        top_p: 0.9,
        temp: 0.6,
      });
    });
  } catch (err) {
    loadFallback("Generation error");
    return;
  }

  const text = extractResponse(generated, prompt);
  if (!text || text.length < 40) {
    loadFallback("Model produced no usable output");
    return;
  }

  prepareText(text);
  setStatus("Model ready", true);
  newParagraphBtn.disabled = false;
  startBtn.disabled = false;
}

function initModel() {
  setStatus("Downloading model (first time only, ~353 MB)…");

  try {
    llmEngine = new LLM(
      "GGUF_CPU",
      MODEL_URL,
      () => {
        modelReady = true;
        setStatus("Model ready — generating first paragraph…", true);
        generateParagraph();
      },
      () => {},
      () => {}
    );

    llmEngine.load_worker();
  } catch (err) {
    loadFallback("Model failed to load");
  }
}

// Speech recognition setup
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-US";
recognition.interimResults = true;
recognition.continuous = true;

function levenshteinDistance(a, b) {
  if (!a) return b.length;
  if (!b) return a.length;
  a = a.toLowerCase();
  b = b.toLowerCase();
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

async function fetchWordMeaning(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0].meanings
        .map((m) => `<strong>${m.partOfSpeech}:</strong> ${m.definitions[0].definition}`)
        .join("<br>");
    }
    return "No definition found.";
  } catch {
    return "Error fetching word meaning.";
  }
}

startBtn.addEventListener("click", () => {
  if (startBtn.textContent === "Start Reading") {
    recognition.start();
    startBtn.textContent = "Stop Reading";
  } else {
    recognition.stop();
    startBtn.textContent = "Start Reading";
  }
});

newParagraphBtn.addEventListener("click", () => {
  recognition.stop();
  startBtn.textContent = "Start Reading";
  if (modelReady) {
    generateParagraph();
  } else {
    loadFallback("Model unavailable");
  }
});

pronounceBtn.addEventListener("click", async () => {
  const word = window.getSelection().toString().trim();
  if (word) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    document.getElementById("word-meaning").innerHTML = await fetchWordMeaning(word);
  }
});

recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map((r) => r[0].transcript)
    .join(" ");
  transcriptElement.textContent = transcript;
  const spoken = transcript.toLowerCase().trim().split(/\s+/).filter(w => w);
  while (spokenIdx < spoken.length && highlightedIndex < wordCount) {
    if (levenshteinDistance(spoken[spokenIdx], words[highlightedIndex]) <= 2) {
      highlightedText.innerHTML += `<span class="highlight">${words[highlightedIndex]}</span> `;
      debugText += " " + words[highlightedIndex];
      highlightedIndex++;
    }
    spokenIdx++;
  }
};

recognition.onend = () => {
  spokenIdx = 0;
  if (startBtn.textContent === "Stop Reading") recognition.start();
};

initModel();
