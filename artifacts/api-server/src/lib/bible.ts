import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger";

const BIBLES_DIR = path.resolve(process.cwd(), "data/bibles");

if (!fs.existsSync(BIBLES_DIR)) {
  fs.mkdirSync(BIBLES_DIR, { recursive: true });
}

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleBook {
  name: string;
  chapters: BibleChapter[];
}

export interface BibleData {
  version: string;
  books: BibleBook[];
}

export interface BibleVersionMeta {
  id: string;
  name: string;
  abbreviation: string;
  bookCount: number;
  verseCount: number;
  uploadedAt: string;
}

function getMetaPath(id: string): string {
  return path.join(BIBLES_DIR, `${id}.meta.json`);
}

function getDataPath(id: string): string {
  return path.join(BIBLES_DIR, `${id}.data.json`);
}

export function listBibleVersions(): BibleVersionMeta[] {
  if (!fs.existsSync(BIBLES_DIR)) return [];
  const files = fs.readdirSync(BIBLES_DIR).filter((f) => f.endsWith(".meta.json"));
  const versions: BibleVersionMeta[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(BIBLES_DIR, file), "utf-8");
      versions.push(JSON.parse(content) as BibleVersionMeta);
    } catch (e) {
      logger.warn({ file }, "Failed to read Bible meta file");
    }
  }
  return versions.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

export function saveBibleVersion(
  id: string,
  name: string,
  abbreviation: string,
  data: BibleData
): BibleVersionMeta {
  let verseCount = 0;
  for (const book of data.books) {
    for (const chapter of book.chapters) {
      verseCount += chapter.verses.length;
    }
  }

  const meta: BibleVersionMeta = {
    id,
    name,
    abbreviation,
    bookCount: data.books.length,
    verseCount,
    uploadedAt: new Date().toISOString(),
  };

  fs.writeFileSync(getMetaPath(id), JSON.stringify(meta, null, 2));
  fs.writeFileSync(getDataPath(id), JSON.stringify(data));

  logger.info({ id, name, bookCount: meta.bookCount, verseCount }, "Bible version saved");
  return meta;
}

export function deleteBibleVersion(id: string): boolean {
  const metaPath = getMetaPath(id);
  const dataPath = getDataPath(id);
  if (!fs.existsSync(metaPath)) return false;
  fs.rmSync(metaPath, { force: true });
  fs.rmSync(dataPath, { force: true });
  logger.info({ id }, "Bible version deleted");
  return true;
}

export function getBibleVersionMeta(id: string): BibleVersionMeta | null {
  const metaPath = getMetaPath(id);
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as BibleVersionMeta;
}

export function loadBibleData(id: string): BibleData | null {
  const dataPath = getDataPath(id);
  if (!fs.existsSync(dataPath)) return null;
  return JSON.parse(fs.readFileSync(dataPath, "utf-8")) as BibleData;
}

/** Search all loaded Bibles for verses relevant to keywords */
export function searchBiblePassages(keywords: string[], maxResults = 12): string {
  const versions = listBibleVersions();
  if (versions.length === 0) {
    return "";
  }

  const results: Array<{ ref: string; text: string; score: number; version: string }> = [];
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const meta of versions.slice(0, 2)) {
    const data = loadBibleData(meta.id);
    if (!data) continue;

    for (const book of data.books) {
      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          const lowerText = verse.text.toLowerCase();
          let score = 0;
          for (const kw of lowerKeywords) {
            if (lowerText.includes(kw)) score++;
          }
          if (score > 0) {
            results.push({
              ref: `${book.name} ${chapter.chapter}:${verse.verse}`,
              text: verse.text,
              score,
              version: meta.abbreviation,
            });
          }
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, maxResults);

  if (top.length === 0) return "";

  return top
    .map((r) => `${r.ref} (${r.version}): "${r.text}"`)
    .join("\n");
}

/**
 * Parse a plain-text Bible file into BibleData.
 *
 * Supports the most common downloaded .txt formats:
 *
 * Format A — one verse per line, reference first:
 *   Genesis 1:1 In the beginning God created...
 *   Genesis 1:2 And the earth was without form...
 *
 * Format B — pipe or tab separated:
 *   Genesis|1|1|In the beginning...
 *   Genesis\t1\t1\tIn the beginning...
 *
 * Format C — sectioned with book/chapter headers, numbered verses:
 *   GENESIS
 *   Chapter 1
 *   1 In the beginning...
 *   2 And the earth was...
 */
export function parsePlainTextBible(text: string, abbreviation: string): BibleData {
  const lines = text.split(/\r?\n/);
  const booksMap = new Map<string, Map<number, Map<number, string>>>();

  // Try Format A/B first — look for lines that start with a book reference
  // Pattern: optional whitespace, word(s) for book name, space or separator, chapter:verse or chapter sep verse
  const refLinePattern =
    /^([1-3]?\s*[A-Za-z][A-Za-z\s']+?)\s+(\d+)[:\s|](\d+)[:\s|]?\s*(.+)$/;
  const pipeSepPattern =
    /^([1-3]?\s*[A-Za-z][A-Za-z\s']+?)[|\t](\d+)[|\t](\d+)[|\t](.+)$/;

  let parsedCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let bookName: string | null = null;
    let chapterNum: number | null = null;
    let verseNum: number | null = null;
    let verseText: string | null = null;

    const pipeMatch = line.match(pipeSepPattern);
    if (pipeMatch) {
      bookName = pipeMatch[1].trim();
      chapterNum = parseInt(pipeMatch[2], 10);
      verseNum = parseInt(pipeMatch[3], 10);
      verseText = pipeMatch[4].trim();
    } else {
      const refMatch = line.match(refLinePattern);
      if (refMatch) {
        bookName = refMatch[1].trim();
        chapterNum = parseInt(refMatch[2], 10);
        verseNum = parseInt(refMatch[3], 10);
        verseText = refMatch[4].trim();
      }
    }

    if (bookName && chapterNum && verseNum && verseText) {
      if (!booksMap.has(bookName)) booksMap.set(bookName, new Map());
      const chaptersMap = booksMap.get(bookName)!;
      if (!chaptersMap.has(chapterNum)) chaptersMap.set(chapterNum, new Map());
      chaptersMap.get(chapterNum)!.set(verseNum, verseText);
      parsedCount++;
    }
  }

  // Format C fallback — header-based sectioned format
  if (parsedCount === 0) {
    let currentBook: string | null = null;
    let currentChapter: number | null = null;
    const chapterHeaderPattern = /^(?:chapter|ch\.?)\s+(\d+)/i;
    const bookHeaderPattern = /^(?:the\s+)?(?:book\s+of\s+)?([A-Za-z][A-Za-z\s']+)$/i;
    const numberedVersePattern = /^(\d+)\s+(.+)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const chapterMatch = line.match(chapterHeaderPattern);
      if (chapterMatch) {
        currentChapter = parseInt(chapterMatch[1], 10);
        continue;
      }

      const verseMatch = line.match(numberedVersePattern);
      if (verseMatch && currentBook && currentChapter) {
        const verseNum = parseInt(verseMatch[1], 10);
        const verseText = verseMatch[2].trim();
        if (verseNum > 0 && verseNum <= 200 && verseText.length > 2) {
          if (!booksMap.has(currentBook)) booksMap.set(currentBook, new Map());
          const chaptersMap = booksMap.get(currentBook)!;
          if (!chaptersMap.has(currentChapter)) chaptersMap.set(currentChapter, new Map());
          chaptersMap.get(currentChapter)!.set(verseNum, verseText);
          parsedCount++;
        }
        continue;
      }

      // Treat as potential book header (all caps or title case, no digits)
      if (!line.match(/\d/) && line.length > 2 && line.length < 40) {
        const bookMatch = line.match(bookHeaderPattern);
        if (bookMatch) {
          const candidate = bookMatch[1].trim();
          // Simple title-case or all-caps check
          if (candidate === candidate.toUpperCase() || /^[A-Z][a-z]/.test(candidate)) {
            currentBook = candidate;
            currentChapter = null;
          }
        }
      }
    }
  }

  if (parsedCount === 0) {
    throw new Error(
      "Could not parse any verses from this file. Supported formats:\n" +
        "• One verse per line: Genesis 1:1 In the beginning...\n" +
        "• Pipe-separated: Genesis|1|1|In the beginning...\n" +
        "• Tab-separated: Genesis\\t1\\t1\\tIn the beginning...\n" +
        "• Sectioned with headers and numbered verses"
    );
  }

  // Convert map structure to BibleData
  const books: BibleBook[] = [];
  for (const [bookName, chaptersMap] of booksMap) {
    const chapters: BibleChapter[] = [];
    for (const [chapterNum, versesMap] of chaptersMap) {
      const verses: BibleVerse[] = [];
      for (const [verseNum, text] of versesMap) {
        verses.push({ verse: verseNum, text });
      }
      verses.sort((a, b) => a.verse - b.verse);
      chapters.push({ chapter: chapterNum, verses });
    }
    chapters.sort((a, b) => a.chapter - b.chapter);
    books.push({ name: bookName, chapters });
  }

  logger.info({ parsedCount, bookCount: books.length }, "Parsed plain-text Bible");
  return { version: abbreviation, books };
}

/** Extract meaningful keywords from a message for Bible search */
export function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "dare",
    "ought", "used", "how", "what", "when", "where", "who", "why", "which",
    "this", "that", "these", "those", "i", "me", "my", "myself", "we",
    "our", "you", "your", "he", "she", "it", "they", "them", "his", "her",
    "its", "their", "about", "feel", "feeling", "am", "im",
  ]);

  return message
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));
}
