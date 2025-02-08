const startBtn = document.getElementById("startBtn");
const pronounceBtn = document.getElementById("pronounceBtn");
const transcriptElement = document.getElementById("transcript");
const highlightedText = document.getElementById("highlighted-text");

async function fetchDisplayText() {
  try {
    const response = await fetch(
      "https://wourf43voqpqjsitzplluyj34m0dpnxw.lambda-url.us-east-1.on.aws/"
    );
    const data = await response.json();
    return data.replace(/^"|"$/g, ""); // Remove surrounding quotes
  } catch (error) {
    console.error("Error fetching display text:", error);
    return "Error fetching text. Please try again.";
  }
}

let displayText, cleanText, words, wordCount;

async function initializeText() {
  const fetchedText = await fetchDisplayText();
  displayText = document.getElementById("display-text");
  displayText.textContent = fetchedText;

  cleanText = fetchedText
    .replace(/[^\w\s]|_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  words = cleanText.split(" ");
  wordCount = words.length;
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
  const textContent = displayText.textContent;

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
