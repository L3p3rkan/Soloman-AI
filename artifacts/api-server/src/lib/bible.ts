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
