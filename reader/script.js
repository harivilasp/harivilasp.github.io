import { LLM } from "./llm.js/llm.js";

const MODEL_URL =
  "https://huggingface.co/afrideva/TinyMistral-248M-Alpaca-GGUF/resolve/main/tinymistral-248m-alpaca.q4_k_m.gguf";

const TOPICS = [
  "the deep ocean and bioluminescent creatures",
  "how black holes form and what happens near them",
  "the history of the printing press and its impact",
  "how trees communicate through underground fungi",
  "the science of why the sky changes color at sunset",
  "ancient Rome's engineering achievements",
  "how the human immune system fights viruses",
  "the discovery of electricity and early experiments",
  "migration patterns of monarch butterflies",
  "how languages evolve and change over centuries",
];

const BACKUP_PARAGRAPHS = [
  "The deep ocean is one of the least explored places on Earth, yet it teems with remarkable life. Bioluminescent creatures like the anglerfish and the firefly squid produce their own light through chemical reactions. This living light serves many purposes: attracting prey, communicating with mates, and confusing predators. Scientists estimate that over ninety percent of deep-sea animals are capable of producing light.",
  "Black holes form when massive stars exhaust their nuclear fuel and collapse under their own gravity. The resulting object is so dense that nothing, not even light, can escape once it crosses the event horizon. Despite their reputation, black holes do not roam the universe sucking up everything around them. Stars and planets near a black hole simply orbit it, much as Earth orbits the Sun.",
  "The printing press, invented by Johannes Gutenberg around 1440, transformed the way information spread across Europe. Before its invention, books were copied by hand, making them rare and expensive. Within decades of Gutenberg's invention, millions of books were in circulation, making knowledge accessible to ordinary people for the first time. Historians credit the printing press with accelerating the Renaissance, the Reformation, and the Scientific Revolution.",
  "Trees in a forest are connected by a vast underground network of fungi called mycorrhizae. Through this network, trees share water, nutrients, and even chemical warning signals when insects attack. Older trees, sometimes called mother trees, actively support younger seedlings by channeling sugars through the fungal web. Scientists are only beginning to understand the complexity of this silent communication system beneath our feet.",
  "Languages are never static; they evolve constantly through contact, migration, and cultural change. Words that seem fundamentally English, like algebra, sofa, and coffee, were borrowed from Arabic. Over centuries, pronunciations shift, new words enter from other languages, and old words take on new meanings. Linguists estimate that a new word enters the English language roughly every two hours.",
  "The human immune system is a sophisticated defense network involving billions of specialized cells. When a virus enters the body, white blood cells called lymphocytes identify it and begin producing antibodies tailored to that specific invader. Memory cells then retain a record of the pathogen so the immune system can respond faster if it ever returns. Vaccines work by training this memory system without causing the actual disease.",
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

function buildPrompt(topic) {
  return `Write a single short paragraph about ${topic}. Use 3 to 4 clear sentences. Output only the paragraph.\n\n`;
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

  let generated = "";

  try {
    await new Promise((resolve, reject) => {
      llmEngine.write_result_callback = (token) => {
        generated += token;
        displayTextElement.textContent = generated;
      };

      llmEngine.on_complete_callback = () => {
        llmEngine.write_result_callback = () => {};
        llmEngine.on_complete_callback = () => {};
        resolve();
      };

      llmEngine.run({
        prompt: buildPrompt(randomTopic()),
        max_token_len: 120,
        top_k: 40,
        top_p: 0.9,
        temp: 0.8,
      });
    });
  } catch (err) {
    loadFallback("Generation error");
    return;
  }

  const text = generated.trim();
  if (!text) {
    loadFallback("Model produced no output");
    return;
  }

  prepareText(text);
  setStatus("Model ready", true);
  newParagraphBtn.disabled = false;
  startBtn.disabled = false;
}

function initModel() {
  setStatus("Downloading model (first time only, ~156 MB)…");

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
  const spoken = transcript.toLowerCase().split(" ");
  for (let i = highlightedIndex; i <= Math.min(spoken.length, wordCount); i++) {
    if (levenshteinDistance(spoken[i], words[highlightedIndex]) <= 2) {
      highlightedText.innerHTML += `<span class="highlight">${words[highlightedIndex]}</span> `;
      debugText += " " + words[highlightedIndex];
      highlightedIndex++;
    }
  }
};

recognition.onend = () => {
  if (startBtn.textContent === "Stop Reading") recognition.start();
};

initModel();
