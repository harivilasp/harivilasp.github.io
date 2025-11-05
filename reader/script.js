const startBtn = document.getElementById("startBtn");
const pronounceBtn = document.getElementById("pronounceBtn");
const transcriptElement = document.getElementById("transcript");
const highlightedText = document.getElementById("highlighted-text");

const paragraphs = [
  "This is the first sample paragraph for the reader application. It will be used to test the highlighting and pronunciation features. We can add more sentences to make it longer and more comprehensive. The quick brown fox jumps over the lazy dog.",
  "Here is the second paragraph. It contains different words and phrases to provide variety. Learning to read effectively involves practice and understanding context. A journey of a thousand miles begins with a single step.",
  "The third paragraph offers another set of challenges for the reader. Focus on your pronunciation and try to understand the meaning of each sentence. Reading regularly improves vocabulary and comprehension skills. The early bird catches the worm.",
  "This is the fourth paragraph, designed to further test the application's capabilities. Pay attention to the flow and rhythm of the text. Consistent reading habits lead to better literacy. All that glitters is not gold.",
  "Finally, the fifth paragraph provides additional content. Engage with the text actively to enhance your reading experience. Practice makes perfect when it comes to mastering any skill. When in Rome, do as the Romans do.",
];

let displayTextElement, cleanText, words, wordCount;

function getRandomParagraph() {
  const randomIndex = Math.floor(Math.random() * paragraphs.length);
  return paragraphs[randomIndex];
}

async function initializeText() {
  const selectedParagraph = getRandomParagraph();
  displayTextElement = document.getElementById("display-text");
  displayTextElement.textContent = selectedParagraph;

  cleanText = selectedParagraph
    .replace(/[^\w\s]|_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  words = cleanText.split(" ");
  wordCount = words.length;
  currentIndex = 0; // Reset for new paragraph
  highlightedIndex = 0; // Reset for new paragraph
  highlightedText.innerHTML = ""; // Clear highlighted text
  transcriptElement.textContent = ""; // Clear transcript
}

let debugText = "";

let currentIndex = 0;
let highlightedIndex = 0;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-US";
recognition.interimResults = true;
recognition.continuous = true;

// Call initializeText before setting up event listeners
initializeText().then(() => {
  startBtn.addEventListener("click", () => {
    if (startBtn.textContent === "Start Reading") {
      recognition.start();
      startBtn.textContent = "Stop Reading";
    } else {
      recognition.stop();
      startBtn.textContent = "Start Reading";
    }
  });

  const newParagraphBtn = document.getElementById("newParagraphBtn");
  if (newParagraphBtn) {
    newParagraphBtn.addEventListener("click", () => {
      recognition.stop(); // Stop current recognition if active
      startBtn.textContent = "Start Reading"; // Reset start button text
      initializeText(); // Load a new random paragraph
    });
  }
  const textContent = displayTextElement.textContent;

  // displayText.addEventListener("mouseup", () => {
  //   const selection = window.getSelection();
  //   selectedWord = selection.toString().trim();

  //   // if (selectedWord) {
  //   //   pronounceBtn.disabled = false;
  //   // } else {
  //   //   pronounceBtn.disabled = true;
  //   // }
  // });

  async function fetchWordMeaning(word) {
    word = word.toLowerCase();
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      const data = await response.json();
      console.log(data);

      if (Array.isArray(data) && data.length > 0) {
        const meanings = data[0].meanings;
        let meaningText = "";

        for (const meaning of meanings) {
          meaningText += `<strong>${meaning.partOfSpeech}:</strong> ${meaning.definitions[0].definition}<br>`;
        }

        return meaningText;
      } else {
        return "No definition found.";
      }
    } catch (error) {
      console.error("Error fetching word meaning:", error);
      return "Error fetching word meaning.";
    }
  }

  pronounceBtn.addEventListener("click", async () => {
    const selection = window.getSelection();
    selectedWord = selection.toString().trim();
    if (selectedWord) {
      const utterance = new SpeechSynthesisUtterance(selectedWord);
      window.speechSynthesis.speak(utterance);

      const wordMeaning = await fetchWordMeaning(selectedWord);
      document.getElementById("word-meaning").innerHTML = wordMeaning;
    }
  });

  function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    a = a.toLowerCase();
    b = b.toLowerCase();

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  console.log(words);

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    transcriptElement.textContent = transcript;
    const spokenWords = transcript.toLowerCase().split(" ");
    console.log(debugText, highlightedIndex, spokenWords.length);
    for (
      let i = highlightedIndex;
      i <= Math.min(spokenWords.length, wordCount);
      i++
    ) {
      const spokenWord = spokenWords[i];
      const textWord = words[highlightedIndex];
      if (levenshteinDistance(spokenWord, textWord) <= 2) {
        highlightedText.innerHTML += `<span class="highlight">${textWord}</span> `;
        debugText += " " + textWord;
        highlightedIndex++;
      }
    }
  };

  recognition.onend = () => {
    if (startBtn.textContent === "Stop Reading") {
      recognition.start();
    }
  };
});
