const HOMOPHONE_GROUPS = [
  ["to", "too", "two"],
  ["there", "their", "theyre"],
  ["your", "youre"],
  ["its", "it's"],
];

const HOMOPHONES = new Map(
  HOMOPHONE_GROUPS.flatMap((group) => group.map((word) => [word, group[0]]))
);

export function normalizeWord(value) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function levenshteinDistance(a, b) {
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let row = 1; row <= a.length; row++) {
    current[0] = row;
    for (let column = 1; column <= b.length; column++) {
      current[column] =
        a[row - 1] === b[column - 1]
          ? previous[column - 1]
          : Math.min(previous[column - 1], previous[column], current[column - 1]) + 1;
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

export function isWordMatch(spokenValue, expectedValue) {
  const spoken = normalizeWord(spokenValue);
  const expected = normalizeWord(expectedValue);

  if (!spoken || !expected) return false;
  if (
    spoken === expected ||
    (HOMOPHONES.has(spoken) && HOMOPHONES.get(spoken) === HOMOPHONES.get(expected))
  ) {
    return true;
  }

  const longestLength = Math.max(spoken.length, expected.length);
  if (longestLength <= 4 || spoken[0] !== expected[0]) return false;

  const distance = levenshteinDistance(spoken, expected);
  if (longestLength <= 7) return distance <= 1;

  return distance <= 2 && distance / longestLength <= 0.25;
}

export function findMatchOffset(spoken, expectedWords, startIndex, lookAhead = 3) {
  const finalIndex = Math.min(expectedWords.length - 1, startIndex + lookAhead);
  for (let index = startIndex; index <= finalIndex; index++) {
    if (isWordMatch(spoken, expectedWords[index])) return index - startIndex;
  }
  return -1;
}
