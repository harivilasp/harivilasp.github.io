import { findMatchOffset, normalizeWord } from "./matcher.js";

const STORY_API_URL =
  "https://freellm-rho.vercel.app/api/public/prompts/prm_3Zhrf_-sOKutA8SGQ_jkRG-E/runs";
const STORY_API_KEY = "flm_fLnQCbEmEKZfrDidhhverj4d3n84sSk3T9W2aAOPlOI";

const startBtn = document.getElementById("startBtn");
const newParagraphBtn = document.getElementById("newParagraphBtn");
const pronounceBtn = document.getElementById("pronounceBtn");
const restartBtn = document.getElementById("restartBtn");
const transcriptElement = document.getElementById("transcript");
const displayTextElement = document.getElementById("display-text");
const modelStatus = document.getElementById("model-status");
const correctCountElement = document.getElementById("correct-count");
const missedCountElement = document.getElementById("missed-count");

let expectedWords = [];
let wordElements = [];
let nextWordIndex = 0;
let correctWordIndexes = new Set();
let mistakenWordIndexes = new Set();
let processedFinalResults = new Set();

function setStatus(message, ok = null) {
  modelStatus.textContent = message;
  modelStatus.style.color = ok === true ? "#4caf50" : ok === false ? "#e53935" : "#555";
}

function prepareText(text) {
  displayTextElement.replaceChildren();
  expectedWords = [];
  wordElements = [];

  const wordPattern = /[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu;
  let previousEnd = 0;

  for (const match of text.matchAll(wordPattern)) {
    displayTextElement.append(text.slice(previousEnd, match.index));

    const wordElement = document.createElement("span");
    wordElement.className = "story-word";
    wordElement.textContent = match[0];
    wordElement.dataset.wordIndex = String(expectedWords.length);
    displayTextElement.append(wordElement);

    expectedWords.push(normalizeWord(match[0]));
    wordElements.push(wordElement);
    previousEnd = match.index + match[0].length;
  }

  displayTextElement.append(text.slice(previousEnd));
  transcriptElement.textContent = "";
  resetReadingProgress();
}

function resetReadingProgress() {
  nextWordIndex = 0;
  correctWordIndexes = new Set();
  mistakenWordIndexes = new Set();
  processedFinalResults = new Set();
  wordElements.forEach((element) => {
    element.classList.remove("correct", "missed", "current");
  });
  updateReadingDisplay();
}

function updateReadingDisplay() {
  wordElements.forEach((element, index) => {
    element.classList.toggle("correct", correctWordIndexes.has(index));
    element.classList.toggle(
      "missed",
      mistakenWordIndexes.has(index) && !correctWordIndexes.has(index)
    );
    element.classList.toggle("current", index === nextWordIndex);
  });
  correctCountElement.textContent = String(correctWordIndexes.size);
  missedCountElement.textContent = String(mistakenWordIndexes.size);
}

function processSpokenWords(spokenWords) {
  for (const spokenWord of spokenWords) {
    if (nextWordIndex >= expectedWords.length) break;

    const offset = findMatchOffset(spokenWord, expectedWords, nextWordIndex);
    if (offset === -1) {
      mistakenWordIndexes.add(nextWordIndex);
      continue;
    }

    for (let index = nextWordIndex; index < nextWordIndex + offset; index++) {
      mistakenWordIndexes.add(index);
    }

    const matchedIndex = nextWordIndex + offset;
    correctWordIndexes.add(matchedIndex);
    nextWordIndex = matchedIndex + 1;
  }

  updateReadingDisplay();

  if (nextWordIndex >= expectedWords.length) {
    setStatus("Story complete!", true);
    recognition?.stop();
    startBtn.textContent = "▶ Start Reading";
  }
}

async function fetchStory() {
  const response = await fetch(STORY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STORY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: {} }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || "Story request failed");
  }
  if (typeof data?.output !== "string" || !data.output.trim()) {
    throw new Error("The story service returned an empty response");
  }

  return data.output.trim();
}

async function generateParagraph() {
  newParagraphBtn.disabled = true;
  startBtn.disabled = true;
  setStatus("Generating a new story…");

  try {
    prepareText(await fetchStory());
    setStatus("Story ready", true);
  } catch (error) {
    console.error("Could not generate a story", error);
    setStatus("Could not generate a story. Please try again.", false);
    if (expectedWords.length === 0) {
      displayTextElement.textContent =
        "Couldn’t load a story. Press New Story to try again.";
    }
  } finally {
    newParagraphBtn.disabled = false;
    startBtn.disabled = !recognition || expectedWords.length === 0;
  }
}

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;
} else {
  startBtn.title = "Speech recognition is not supported in this browser";
}

async function fetchWordMeaning(word) {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
    );
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0].meanings
        .map(
          (meaning) =>
            `<strong>${meaning.partOfSpeech}:</strong> ${meaning.definitions[0].definition}`
        )
        .join("<br>");
    }
    return "No definition found.";
  } catch {
    return "Error fetching word meaning.";
  }
}

startBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (startBtn.textContent.includes("Start Reading")) {
    if (nextWordIndex >= expectedWords.length) resetReadingProgress();
    processedFinalResults.clear();
    recognition.start();
    startBtn.textContent = "■ Stop Reading";
    setStatus("Listening…");
  } else {
    recognition.stop();
    startBtn.textContent = "▶ Start Reading";
    setStatus("Reading paused");
  }
});

newParagraphBtn.addEventListener("click", () => {
  recognition?.stop();
  startBtn.textContent = "▶ Start Reading";
  generateParagraph();
});

restartBtn.addEventListener("click", () => {
  recognition?.stop();
  startBtn.textContent = "▶ Start Reading";
  transcriptElement.textContent = "";
  resetReadingProgress();
  setStatus("Ready to start again", true);
});

pronounceBtn.addEventListener("click", async () => {
  const word = window.getSelection().toString().trim();
  if (!word) return;

  window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
  document.getElementById("word-meaning").innerHTML = await fetchWordMeaning(word);
});

if (recognition) {
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    transcriptElement.textContent = transcript;

    for (let index = 0; index < event.results.length; index++) {
      const result = event.results[index];
      if (!result.isFinal || processedFinalResults.has(index)) continue;

      const spokenWords = result[0].transcript
        .split(/\s+/)
        .map(normalizeWord)
        .filter(Boolean);
      processSpokenWords(spokenWords);
      processedFinalResults.add(index);
    }
  };

  recognition.onend = () => {
    if (startBtn.textContent.includes("Stop Reading")) {
      processedFinalResults.clear();
      recognition.start();
    }
  };
}

generateParagraph();
