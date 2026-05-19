import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, bibles } from "@workspace/db";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Startup: migrate any existing disk files into the database once
// ---------------------------------------------------------------------------

const LEGACY_BIBLES_DIR = path.resolve(process.cwd(), "data/bibles");

export async function migrateDiskBibles(): Promise<void> {
  if (!fs.existsSync(LEGACY_BIBLES_DIR)) return;

  const metaFiles = fs.readdirSync(LEGACY_BIBLES_DIR).filter((f) => f.endsWith(".meta.json"));
  if (metaFiles.length === 0) return;

  for (const file of metaFiles) {
    try {
      const id = file.replace(".meta.json", "");
      const existing = await db.select({ id: bibles.id }).from(bibles).where(eq(bibles.id, id));
      if (existing.length > 0) continue;

      const meta = JSON.parse(
        fs.readFileSync(path.join(LEGACY_BIBLES_DIR, file), "utf-8")
      ) as BibleVersionMeta;

      const dataPath = path.join(LEGACY_BIBLES_DIR, `${id}.data.json`);
      if (!fs.existsSync(dataPath)) continue;

      const bibleData = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as BibleData;

      await db.insert(bibles).values({
        id: meta.id,
        name: meta.name,
        abbreviation: meta.abbreviation,
        bookCount: meta.bookCount,
        verseCount: meta.verseCount,
        booksData: bibleData as unknown as Record<string, unknown>,
        uploadedAt: new Date(meta.uploadedAt),
      });

      logger.info({ id, name: meta.name }, "Migrated Bible from disk to database");
    } catch (e) {
      logger.warn({ file, err: e }, "Failed to migrate Bible disk file");
    }
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listBibleVersions(): Promise<BibleVersionMeta[]> {
  const rows = await db
    .select({
      id: bibles.id,
      name: bibles.name,
      abbreviation: bibles.abbreviation,
      bookCount: bibles.bookCount,
      verseCount: bibles.verseCount,
      uploadedAt: bibles.uploadedAt,
    })
    .from(bibles)
    .orderBy(bibles.uploadedAt);

  return rows
    .map((r) => ({ ...r, uploadedAt: r.uploadedAt.toISOString() }))
    .reverse();
}

export async function saveBibleVersion(
  id: string,
  name: string,
  abbreviation: string,
  data: BibleData
): Promise<BibleVersionMeta> {
  let verseCount = 0;
  for (const book of data.books) {
    for (const chapter of book.chapters) {
      verseCount += chapter.verses.length;
    }
  }

  const uploadedAt = new Date();

  await db.insert(bibles).values({
    id,
    name,
    abbreviation,
    bookCount: data.books.length,
    verseCount,
    booksData: data as unknown as Record<string, unknown>,
    uploadedAt,
  });

  logger.info({ id, name, bookCount: data.books.length, verseCount }, "Bible version saved");

  return {
    id,
    name,
    abbreviation,
    bookCount: data.books.length,
    verseCount,
    uploadedAt: uploadedAt.toISOString(),
  };
}

export async function deleteBibleVersion(id: string): Promise<boolean> {
  const result = await db.delete(bibles).where(eq(bibles.id, id)).returning({ id: bibles.id });
  if (result.length === 0) return false;
  logger.info({ id }, "Bible version deleted");
  return true;
}

export async function getBibleVersionMeta(id: string): Promise<BibleVersionMeta | null> {
  const [row] = await db
    .select({
      id: bibles.id,
      name: bibles.name,
      abbreviation: bibles.abbreviation,
      bookCount: bibles.bookCount,
      verseCount: bibles.verseCount,
      uploadedAt: bibles.uploadedAt,
    })
    .from(bibles)
    .where(eq(bibles.id, id));

  if (!row) return null;
  return { ...row, uploadedAt: row.uploadedAt.toISOString() };
}

export async function loadBibleData(id: string): Promise<BibleData | null> {
  const [row] = await db
    .select({ booksData: bibles.booksData })
    .from(bibles)
    .where(eq(bibles.id, id));

  if (!row) return null;
  return row.booksData as unknown as BibleData;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchBiblePassages(keywords: string[], maxResults = 12): Promise<string> {
  const versions = await listBibleVersions();
  if (versions.length === 0) return "";

  const results: Array<{ ref: string; text: string; score: number; version: string }> = [];
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const meta of versions.slice(0, 2)) {
    const data = await loadBibleData(meta.id);
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

  return top.map((r) => `${r.ref} (${r.version}): "${r.text}"`).join("\n");
}

// ---------------------------------------------------------------------------
// Parsers (unchanged)
// ---------------------------------------------------------------------------

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
        const vNum = parseInt(verseMatch[1], 10);
        const vText = verseMatch[2].trim();
        if (vNum > 0 && vNum <= 200 && vText.length > 2) {
          if (!booksMap.has(currentBook)) booksMap.set(currentBook, new Map());
          const chaptersMap = booksMap.get(currentBook)!;
          if (!chaptersMap.has(currentChapter)) chaptersMap.set(currentChapter, new Map());
          chaptersMap.get(currentChapter)!.set(vNum, vText);
          parsedCount++;
        }
        continue;
      }

      if (!line.match(/\d/) && line.length > 2 && line.length < 40) {
        const bookMatch = line.match(bookHeaderPattern);
        if (bookMatch) {
          const candidate = bookMatch[1].trim();
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

  const books: BibleBook[] = [];
  for (const [bookName, chaptersMap] of booksMap) {
    const chapters: BibleChapter[] = [];
    for (const [chapterNum, versesMap] of chaptersMap) {
      const verses: BibleVerse[] = [];
      for (const [verseNum, t] of versesMap) {
        verses.push({ verse: verseNum, text: t });
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
