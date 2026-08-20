// Normalization used before comparing player answers.
// " Library " -> "library", "  TRUE " -> "true", etc.

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeAnswer(answerType, value) {
  const raw = String(value == null ? "" : value).trim();

  switch (answerType) {
    case "NUMBER":
      return raw.replace(/[^0-9.]/g, "");
    case "TRUE_FALSE":
      return raw.toLowerCase() === "true" || raw.toLowerCase() === "false"
        ? raw.toLowerCase()
        : raw;
    case "MULTIPLE_CHOICE":
      return raw.toUpperCase().charAt(0);
    default:
      return normalizeText(raw);
  }
}

// Build the list of accepted answers in normalized form.
function buildAcceptedList(clue) {
  const list = [normalizeAnswer(clue.answerType, clue.correctAnswer)];
  for (const alt of clue.acceptedAnswers || []) {
    list.push(normalizeAnswer(clue.answerType, alt));
  }
  return [...new Set(list)];
}

module.exports = { normalizeText, normalizeAnswer, buildAcceptedList };
