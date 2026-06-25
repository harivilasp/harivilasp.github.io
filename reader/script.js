import { findMatchOffset, normalizeWord } from "./matcher.js";

const STORIES = [
  `In a small village surrounded by lush green forests, there lived a young girl named Sophia. She was known for her exceptional kindness and warm smile that could brighten up anyone's day. Sophia spent most of her days helping her mother with household chores and exploring the woods, discovering new species of flowers and birds.

One day, while wandering deeper into the forest than she had ever been before, Sophia stumbled upon a hidden clearing. In the center of the clearing stood an enormous tree, its trunk twisted and gnarled with age. As she approached the tree, she noticed a small door carved into the trunk. The door was slightly ajar, inviting her to enter.

Sophia's curiosity got the better of her, and she pushed the door open. Inside, she found a cozy room filled with books, strange artifacts, and a beautiful wooden desk. An old man with a long white beard and spectacles looked up from the book he was reading and smiled at Sophia.

"Welcome, young one," he said. "I have been expecting you. My name is Professor Everwood, and I have been waiting for someone with a heart full of kindness and a thirst for knowledge to come and find me."

Sophia spent the next few weeks learning from Professor Everwood, discovering the secrets of the forest and the magic that lay within. As she delved deeper into the world of knowledge, Sophia realized that she had a special gift: the ability to communicate with animals.

With Professor Everwood's guidance, Sophia learned to harness her gift and use it to help those in need. She helped a family of baby birds find their way back to their nest, assisted a lost fawn in reuniting with its mother, and even aided a group of bees in finding a new home.

As the days turned into weeks, Sophia's reputation as an animal whisperer spread throughout the village. People would come from all over to seek her help, and Sophia was happy to oblige. She had found her true calling, and with Professor Everwood by her side, she knew that she could make a real difference in the world.`,
  `In a small village surrounded by rolling hills and dense forests, there lived a young girl named Sophia. She was known throughout the village for her extraordinary gift: the ability to communicate with animals. Sophia's days were filled with adventures as she explored the woods, played with the creatures, and learned about their lives.

One sunny afternoon, Sophia wandered deeper into the forest than ever before and found a hidden clearing. In its center stood an enormous tree with branches twisted and gnarled with age. As Sophia approached, she heard the tree whisper her name.

"Sophia, I have been waiting for you," the tree said. "I possess a secret that has been hidden for centuries. Are you brave enough to hear it?"

Sophia nodded eagerly. The tree told her about ancient magic and a world where animals and humans lived together in harmony. As she listened, Sophia felt as if the secrets of the whole forest were opening before her.

From that day on, Sophia spent every spare moment learning from the ancient tree and helping the creatures of the forest. Years later, she became its respected guardian, known and loved by everyone who lived within its green boundaries.`,
  `In a small village surrounded by rolling hills and dense forests, there lived a young girl named Sophia. She was known for her exceptional kindness and her love for nature. Sophia spent most of her days exploring the woods and learning about the plants and animals that lived there.

One day, Sophia found a hidden clearing with an enormous tree covered in shimmering lights. A soft voice came from the tree and told her that a terrible drought had placed the forest in danger. To save it, Sophia would have to find a magical spring hidden deep in the mountains.

Without hesitation, Sophia set off on the journey. The air grew thin and the wind grew cold as she climbed, but she kept going. At last she reached the spring, filled a small vial with its crystal-clear water, and hurried home.

As Sophia returned, green leaves opened and animals came back to their homes. The ancient tree thanked her and named her guardian of the forest. Sophia continued to protect the woods with knowledge and kindness for many years.`,
  `As the sun set over the small town of Willow Creek, a young girl named Lily walked along the riverbank, lost in thought. She loved this time of day, when the sky turned pink and the first stars began to shine.

That morning, Lily had received a letter from an art school in the city. It offered her a scholarship, but accepting it meant leaving her family and friends. She had always dreamed of becoming an artist, yet the choice still frightened her.

While walking, Lily found a small wooden boat hidden in the reeds. She pushed it into the water, climbed aboard, and let the river carry her beneath the evening sky. As the boat drifted, a calm feeling washed over her.

Lily understood that she could love her home and still follow her dream. By the time she returned to the riverbank, the stars were shining brightly and her mind was clear. She walked back into town ready to face the future.`,
];

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
let usedStoryIndices = [];

function setStatus(message, ok = null) {
  modelStatus.textContent = message;
  modelStatus.style.color = ok === true ? "#4caf50" : ok === false ? "#e53935" : "#555";
}

function nextStory() {
  if (usedStoryIndices.length === STORIES.length) usedStoryIndices = [];
  const remaining = STORIES
    .map((_, index) => index)
    .filter((index) => !usedStoryIndices.includes(index));
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  usedStoryIndices.push(pick);
  return STORIES[pick];
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

function showNextStory() {
  setStatus("Story ready", true);
  prepareText(nextStory());
  newParagraphBtn.disabled = false;
  startBtn.disabled = !recognition;
}

function generateParagraph() {
  newParagraphBtn.disabled = true;
  startBtn.disabled = true;
  setStatus("Choosing a story…");
  window.setTimeout(showNextStory, 150);
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
