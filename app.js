const API_BASE = "https://bible-api.com/";
const MAX_PASSAGES = 5;

const form = document.querySelector("#reading-form");
const referencesInput = document.querySelector("#references");
const translationInput = document.querySelector("#translation");
const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = document.querySelector("#status");
const readingsSection = document.querySelector("#readings");
const readingList = document.querySelector("#reading-list");
const copyButton = document.querySelector("#copy-button");
const printButton = document.querySelector("#print-button");
let currentReadings = [];

function parseReferences(value) {
  return value
    .split(/[;\n]+/)
    .map((reference) => reference.trim())
    .filter(Boolean);
}

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.dataset.kind = kind;
}

function getPassageText(readings) {
  return readings
    .map((reading) => {
      const verses = reading.verses
        .map((verse) => `${verse.verse}. ${verse.text.trim()}`)
        .join("\n");
      return `${reading.reference}\n${verses}`;
    })
    .join("\n\n");
}

async function fetchPassage(reference, translation) {
  const url = new URL(encodeURIComponent(reference), API_BASE);
  url.searchParams.set("translation", translation);
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Couldn't find ${reference}. Check the reference and try again.`);
  }

  if (!Array.isArray(data.verses) || data.verses.length === 0) {
    throw new Error(`No verses were returned for ${reference}.`);
  }

  return data;
}

function renderReadings(readings) {
  readingList.replaceChildren();

  for (const reading of readings) {
    const card = document.createElement("article");
    card.className = "passage-card";

    const meta = document.createElement("div");
    meta.className = "passage-meta";
    meta.textContent = reading.translation_name || "Bible passage";

    const title = document.createElement("h3");
    title.className = "passage-title";
    title.textContent = reading.reference;

    const verses = document.createElement("div");
    verses.className = "passage-verses";

    for (const verse of reading.verses) {
      const paragraph = document.createElement("p");
      paragraph.className = "verse";

      const number = document.createElement("span");
      number.className = "verse-number";
      number.textContent = verse.verse;

      paragraph.append(number, document.createTextNode(verse.text.trim()));
      verses.append(paragraph);
    }

    card.append(meta, title, verses);
    readingList.append(card);
  }

  readingsSection.hidden = readings.length === 0;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const references = parseReferences(referencesInput.value);

  if (references.length === 0) {
    setStatus("Enter at least one Bible reference to get started.", "error");
    return;
  }

  if (references.length > MAX_PASSAGES) {
    setStatus(`Please enter no more than ${MAX_PASSAGES} passages at a time.`, "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Gathering your reading…");

  try {
    const readings = await Promise.all(
      references.map((reference) => fetchPassage(reference, translationInput.value)),
    );
    currentReadings = readings;
    renderReadings(readings);
    setStatus(`Ready — ${readings.length} ${readings.length === 1 ? "passage" : "passages"} to read.`);
  } catch (error) {
    currentReadings = [];
    renderReadings([]);
    setStatus(error.message || "The reading couldn't be loaded. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll(".example-chip").forEach((button) => {
  button.addEventListener("click", () => {
    referencesInput.value = button.dataset.reference;
    form.requestSubmit();
  });
});

copyButton.addEventListener("click", async () => {
  if (currentReadings.length === 0) return;

  try {
    await navigator.clipboard.writeText(getPassageText(currentReadings));
    setStatus("Reading copied to your clipboard.");
  } catch {
    setStatus("Couldn't copy automatically. Select the passage text and copy it instead.", "error");
  }
});

printButton.addEventListener("click", () => window.print());
