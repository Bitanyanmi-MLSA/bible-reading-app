import { mkdir, writeFile } from "node:fs/promises";

const sourceCommit = "68669ba3be9719ae4d1135b19d9e0b6587b7c356";
const sourceBase = `https://raw.githubusercontent.com/TehShrike/world-english-bible/${sourceCommit}/json`;
const books = [
  ["GEN", "Genesis", "genesis"], ["EXO", "Exodus", "exodus"], ["LEV", "Leviticus", "leviticus"],
  ["NUM", "Numbers", "numbers"], ["DEU", "Deuteronomy", "deuteronomy"], ["JOS", "Joshua", "joshua"],
  ["JDG", "Judges", "judges"], ["RUT", "Ruth", "ruth"], ["1SA", "1 Samuel", "1samuel"],
  ["2SA", "2 Samuel", "2samuel"], ["1KI", "1 Kings", "1kings"], ["2KI", "2 Kings", "2kings"],
  ["1CH", "1 Chronicles", "1chronicles"], ["2CH", "2 Chronicles", "2chronicles"], ["EZR", "Ezra", "ezra"],
  ["NEH", "Nehemiah", "nehemiah"], ["EST", "Esther", "esther"], ["JOB", "Job", "job"],
  ["PSA", "Psalms", "psalms"], ["PRO", "Proverbs", "proverbs"], ["ECC", "Ecclesiastes", "ecclesiastes"],
  ["SNG", "Song of Solomon", "songofsolomon"], ["ISA", "Isaiah", "isaiah"], ["JER", "Jeremiah", "jeremiah"],
  ["LAM", "Lamentations", "lamentations"], ["EZK", "Ezekiel", "ezekiel"], ["DAN", "Daniel", "daniel"],
  ["HOS", "Hosea", "hosea"], ["JOL", "Joel", "joel"], ["AMO", "Amos", "amos"],
  ["OBA", "Obadiah", "obadiah"], ["JON", "Jonah", "jonah"], ["MIC", "Micah", "micah"],
  ["NAM", "Nahum", "nahum"], ["HAB", "Habakkuk", "habakkuk"], ["ZEP", "Zephaniah", "zephaniah"],
  ["HAG", "Haggai", "haggai"], ["ZEC", "Zechariah", "zechariah"], ["MAL", "Malachi", "malachi"],
  ["MAT", "Matthew", "matthew"], ["MRK", "Mark", "mark"], ["LUK", "Luke", "luke"],
  ["JHN", "John", "john"], ["ACT", "Acts", "acts"], ["ROM", "Romans", "romans"],
  ["1CO", "1 Corinthians", "1corinthians"], ["2CO", "2 Corinthians", "2corinthians"],
  ["GAL", "Galatians", "galatians"], ["EPH", "Ephesians", "ephesians"], ["PHP", "Philippians", "philippians"],
  ["COL", "Colossians", "colossians"], ["1TH", "1 Thessalonians", "1thessalonians"],
  ["2TH", "2 Thessalonians", "2thessalonians"], ["1TI", "1 Timothy", "1timothy"],
  ["2TI", "2 Timothy", "2timothy"], ["TIT", "Titus", "titus"], ["PHM", "Philemon", "philemon"],
  ["HEB", "Hebrews", "hebrews"], ["JAS", "James", "james"], ["1PE", "1 Peter", "1peter"],
  ["2PE", "2 Peter", "2peter"], ["1JN", "1 John", "1john"], ["2JN", "2 John", "2john"],
  ["3JN", "3 John", "3john"], ["JUD", "Jude", "jude"], ["REV", "Revelation", "revelation"],
];

const entries = await Promise.all(books.map(async ([id, name, file]) => {
  const response = await fetch(`${sourceBase}/${file}.json`);
  if (!response.ok) throw new Error(`Could not download ${name}: HTTP ${response.status}`);
  const source = await response.json();
  const chapterMap = new Map();

  for (const entry of source) {
    if (!Number.isInteger(entry.chapterNumber) || !Number.isInteger(entry.verseNumber) || typeof entry.value !== "string") {
      continue;
    }
    const verses = chapterMap.get(entry.chapterNumber) ?? new Map();
    verses.set(entry.verseNumber, [verses.get(entry.verseNumber), entry.value.trim()]
      .filter(Boolean)
      .join(" "));
    chapterMap.set(entry.chapterNumber, verses);
  }

  const chapters = Array.from({ length: chapterMap.size }, (_, chapterIndex) => {
    const verses = chapterMap.get(chapterIndex + 1);
    if (!verses) return null;
    return [...verses]
      .filter(([, text]) => text)
      .sort(([a], [b]) => a - b)
      .map(([verse, text]) => ({ verse, text }));
  });

  if (!chapters.length || chapters.some((chapter) => !chapter?.length)) {
    throw new Error(`Incomplete Scripture data for ${name}`);
  }
  return { id, name, chapters };
}));

const totalChapters = entries.reduce((sum, book) => sum + book.chapters.length, 0);
const totalVerses = entries.reduce((sum, book) => sum + book.chapters.reduce((count, chapter) => count + chapter.length, 0), 0);
if (entries.length !== 66 || totalChapters !== 1189 || totalVerses < 31000) {
  throw new Error(`Unexpected Bible size: ${entries.length} books, ${totalChapters} chapters, ${totalVerses} verses`);
}

const bible = {
  translation_id: "web",
  translation_name: "World English Bible",
  license: "Public Domain",
  source: "https://ebible.org/web/ (data structure derived from TehShrike/world-english-bible)",
  source_commit: sourceCommit,
  books: entries,
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
const output = new URL("../data/web.json", import.meta.url);
await writeFile(output, `${JSON.stringify(bible)}\n`);
console.log(`Wrote ${output.pathname}: ${entries.length} books, ${totalChapters} chapters, ${totalVerses} verses`);
