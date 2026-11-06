const API_BASE = "https://bible-api.com/";
const MAX_PASSAGES = 5;
const OFFLINE_BIBLE_URL = "data/web.json";

const form = document.querySelector("#reading-form");
const referencesInput = document.querySelector("#references");
const translationInput = document.querySelector("#translation");
const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = document.querySelector("#status");
const readingsSection = document.querySelector("#readings");
const readingList = document.querySelector("#reading-list");
const copyButton = document.querySelector("#copy-button");
const printButton = document.querySelector("#print-button");
const connectionStatus = document.querySelector("#connection-status");
const installButton = document.querySelector("#install-button");
let currentReadings = [];
let offlineBible;
let installPrompt;
let offlineReady = false;

const BOOKS = [
  ["Genesis", "genesis", "Gen"],
  ["Exodus", "exodus", "Exod", "Ex"],
  ["Leviticus", "leviticus", "Lev"],
  ["Numbers", "numbers", "Num"],
  ["Deuteronomy", "deuteronomy", "Deut"],
  ["Joshua", "joshua", "Josh"],
  ["Judges", "judges", "Judg"],
  ["Ruth", "ruth"],
  ["1 Samuel", "1samuel", "1 Sam", "I Samuel"],
  ["2 Samuel", "2samuel", "2 Sam", "II Samuel"],
  ["1 Kings", "1kings", "1 Kgs", "I Kings"],
  ["2 Kings", "2kings", "2 Kgs", "II Kings"],
  ["1 Chronicles", "1chronicles", "1 Chr", "I Chronicles"],
  ["2 Chronicles", "2chronicles", "2 Chr", "II Chronicles"],
  ["Ezra", "ezra"],
  ["Nehemiah", "nehemiah", "Neh"],
  ["Esther", "esther", "Est"],
  ["Job", "job"],
  ["Psalms", "psalms", "Psalm", "Psa"],
  ["Proverbs", "proverbs", "Prov"],
  ["Ecclesiastes", "ecclesiastes", "Eccl"],
  ["Song of Solomon", "songofsolomon", "Song of Songs", "Canticles"],
  ["Isaiah", "isaiah", "Isa"],
  ["Jeremiah", "jeremiah", "Jer"],
  ["Lamentations", "lamentations", "Lam"],
  ["Ezekiel", "ezekiel", "Ezek"],
  ["Daniel", "daniel", "Dan"],
  ["Hosea", "hosea", "Hos"],
  ["Joel", "joel"],
  ["Amos", "amos"],
  ["Obadiah", "obadiah", "Obad"],
  ["Jonah", "jonah"],
  ["Micah", "micah"],
  ["Nahum", "nahum"],
  ["Habakkuk", "habakkuk", "Hab"],
  ["Zephaniah", "zephaniah", "Zeph"],
  ["Haggai", "haggai", "Hag"],
  ["Zechariah", "zechariah", "Zech"],
  ["Malachi", "malachi", "Mal"],
  ["Matthew", "matthew", "Matt"],
  ["Mark", "mark", "Mrk"],
  ["Luke", "luke", "Luk"],
  ["John", "john", "Jn"],
  ["Acts", "acts"],
  ["Romans", "romans", "Rom"],
  ["1 Corinthians", "1corinthians", "1 Cor", "I Corinthians"],
  ["2 Corinthians", "2corinthians", "2 Cor", "II Corinthians"],
  ["Galatians", "galatians", "Gal"],
  ["Ephesians", "ephesians", "Eph"],
  ["Philippians", "philippians", "Phil"],
  ["Colossians", "colossians", "Col"],
  ["1 Thessalonians", "1thessalonians", "1 Thess", "I Thessalonians"],
  ["2 Thessalonians", "2thessalonians", "2 Thess", "II Thessalonians"],
  ["1 Timothy", "1timothy", "1 Tim", "I Timothy"],
  ["2 Timothy", "2timothy", "2 Tim", "II Timothy"],
  ["Titus", "titus"],
  ["Philemon", "philemon", "Phlm"],
  ["Hebrews", "hebrews", "Heb"],
  ["James", "james", "Jas"],
  ["1 Peter", "1peter", "1 Pet", "I Peter"],
  ["2 Peter", "2peter", "2 Pet", "II Peter"],
  ["1 John", "1john", "1 Jn", "I John"],
  ["2 John", "2john", "2 Jn", "II John"],
  ["3 John", "3john", "3 Jn", "III John"],
  ["Jude", "jude"],
  ["Revelation", "revelation", "Rev"],
].map(([name, file, ...aliases]) => ({ name, file, aliases: [name, ...aliases] }));

const BOOK_PATTERNS = BOOKS.flatMap((book) =>
  book.aliases.map((alias) => ({
    book,
    pattern: new RegExp(
      `^${alias
        .split(/\s+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s*")}\\s*(?=\\d)`,
      "i",
    ),
  })),
).sort((a, b) => b.pattern.source.length - a.pattern.source.length);

function parseReferences(value) {
  return value
    .split(/[;\n]+/)
    .map((reference) => reference.trim())
    .filter(Boolean);
}

function getBookAndReference(reference) {
  for (const candidate of BOOK_PATTERNS) {
    const match = reference.match(candidate.pattern);
    if (match) return { book: candidate.book, remainder: reference.slice(match[0].length).trim() };
  }

  throw new Error(`Couldn't recognize the Bible book in “${reference}”.`);
}

function parsePassageReference(reference, bible) {
  const { book, remainder } = getBookAndReference(reference);
  const bookData = bible.books.find((item) => item.name === book.name);
  if (!bookData) throw new Error(`Offline text is unavailable for ${book.name}.`);

  const normalizedRemainder = remainder.replace(/[–—−]/g, "-");
  const match = normalizedRemainder.match(/^(\d+)(?::(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?)?(?:\s*-\s*(\d+))?$/);
  if (!match) throw new Error(`Use a reference like “John 3:16-18” or “Psalm 23”.`);

  const startChapter = Number(match[1]);
  const startVerse = Number(match[2] || 1);
  const endChapter = Number(match[3] || match[5] || startChapter);
  const endVerse = Number(match[4] || (match[2] ? startVerse : Number.MAX_SAFE_INTEGER));
  const chapters = bookData.chapters;

  if (
    startChapter < 1 ||
    endChapter > chapters.length ||
    startChapter > endChapter ||
    startVerse < 1 ||
    endVerse < 1
  ) {
    throw new Error(`The chapter or verse range in “${reference}” is outside ${book.name}.`);
  }

  const verses = [];
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const chapterVerses = chapters[chapter - 1];
    const firstVerse = chapter === startChapter ? startVerse : 1;
    const lastVerse = chapter === endChapter ? Math.min(endVerse, chapterVerses.at(-1).verse) : chapterVerses.at(-1).verse;

    if (
      firstVerse > chapterVerses.at(-1).verse ||
      (match[4] && chapter === endChapter && endVerse > chapterVerses.at(-1).verse) ||
      lastVerse < firstVerse ||
      (match[2] && chapter === startChapter && !chapterVerses.some((verse) => verse.verse === firstVerse)) ||
      (match[4] && chapter === endChapter && !chapterVerses.some((verse) => verse.verse === lastVerse))
    ) {
      throw new Error(`The verse range in “${reference}” is outside ${book.name} ${chapter}.`);
    }

    verses.push(...chapterVerses
      .filter((verse) => verse.verse >= firstVerse && verse.verse <= lastVerse)
      .map((verse) => ({ chapter, ...verse })));
  }

  return {
    reference: `${book.name} ${remainder}`,
    translation_name: bible.translation_name,
    verses,
  };
}

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.dataset.kind = kind;
}

function getPassageText(readings) {
  return readings
    .map((reading) => {
      let currentChapter;
      const verses = reading.verses
        .map((verse) => {
          const label = verse.chapter && verse.chapter !== currentChapter
            ? `${verse.chapter}:${verse.verse}`
            : verse.verse;
          currentChapter = verse.chapter || currentChapter;
          return `${label}. ${verse.text.trim()}`;
        })
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

async function fetchOfflineBible() {
  if (!offlineBible) {
    const response = await fetch(OFFLINE_BIBLE_URL);
    if (!response.ok) throw new Error("Offline Bible data could not be loaded.");
    offlineBible = await response.json();
  }
  return offlineBible;
}

function updateConnectionStatus() {
  connectionStatus.textContent = offlineReady
    ? (navigator.onLine ? "Offline reading ready" : "Offline mode")
    : (navigator.onLine ? "Preparing offline reading…" : "Offline setup incomplete");
  connectionStatus.dataset.online = String(navigator.onLine);
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
    let currentChapter;

    for (const verse of reading.verses) {
      const paragraph = document.createElement("p");
      paragraph.className = "verse";

      const number = document.createElement("span");
      number.className = "verse-number";
      number.textContent = verse.chapter && verse.chapter !== currentChapter
        ? `${verse.chapter}:${verse.verse}`
        : String(verse.verse);

      paragraph.append(number, document.createTextNode(verse.text.trim()));
      verses.append(paragraph);
      currentChapter = verse.chapter || currentChapter;
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
    const translation = translationInput.value;
    const readings = translation === "web"
      ? await (async () => {
          const bible = await fetchOfflineBible();
          return references.map((reference) => parsePassageReference(reference, bible));
        })()
      : await Promise.all(references.map((reference) => fetchPassage(reference, translation)));
    currentReadings = readings;
    renderReadings(readings);
    setStatus(`Ready — ${readings.length} ${readings.length === 1 ? "passage" : "passages"} to read.`);
  } catch (error) {
    currentReadings = [];
    renderReadings([]);
    const message = translationInput.value === "kjv" && !navigator.onLine
      ? "The King James Version needs internet. Choose the World English Bible for offline reading."
      : error.message || "The reading couldn't be loaded. Please try again.";
    setStatus(message, "error");
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

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      offlineReady = true;
      updateConnectionStatus();
    })
    .catch(() => {
      connectionStatus.textContent = "Offline setup unavailable";
    });
}
