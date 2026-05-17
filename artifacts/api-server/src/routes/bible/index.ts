import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import {
  listBibleVersions,
  saveBibleVersion,
  deleteBibleVersion,
  getBibleVersionMeta,
  parsePlainTextBible,
  type BibleData,
} from "../../lib/bible";
import { DeleteBibleVersionParams } from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const isJson = file.mimetype === "application/json" || file.originalname.endsWith(".json");
    const isTxt = file.mimetype === "text/plain" || file.originalname.endsWith(".txt");
    if (isJson || isTxt) {
      cb(null, true);
    } else {
      cb(new Error("Only JSON or plain text (.txt) files are supported"));
    }
  },
});

router.get("/bible/versions", async (_req, res): Promise<void> => {
  const versions = listBibleVersions();
  res.json(versions);
});

router.post(
  "/bible/upload",
  upload.single("bible"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const abbreviation =
      typeof req.body.abbreviation === "string"
        ? req.body.abbreviation.trim().toUpperCase()
        : "";

    if (!name || !abbreviation) {
      res.status(400).json({ error: "name and abbreviation are required" });
      return;
    }

    const isTxt =
      req.file.mimetype === "text/plain" || req.file.originalname.endsWith(".txt");

    let bibleData: BibleData;
    try {
      if (isTxt) {
        // Plain-text Bible format
        const text = req.file.buffer.toString("utf-8");
        bibleData = parsePlainTextBible(text, abbreviation);
      } else {
        // JSON Bible format
        const raw = JSON.parse(req.file.buffer.toString("utf-8"));

        // Normalize various common JSON Bible formats
        if (Array.isArray(raw)) {
          // Format: array of books
          bibleData = { version: abbreviation, books: raw };
        } else if (raw.books && Array.isArray(raw.books)) {
          // Standard format: { version, books[] }
          bibleData = raw as BibleData;
        } else if (raw.OSIS) {
          res.status(400).json({
            error:
              "OSIS format is not currently supported. Please convert to standard JSON format: { books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }",
          });
          return;
        } else {
          res.status(400).json({
            error:
              "Unrecognized Bible JSON format. Expected: { books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }",
          });
          return;
        }
      }

      if (!bibleData.books || bibleData.books.length === 0) {
        res.status(400).json({ error: "Bible file has no books" });
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to parse Bible file";
      req.log.warn({ err: e, isTxt }, "Invalid Bible file");
      res.status(400).json({ error: msg });
      return;
    }

    const id = randomUUID();
    const meta = saveBibleVersion(id, name, abbreviation, bibleData);

    res.status(201).json(meta);
  }
);

router.delete("/bible/versions/:versionId", async (req, res): Promise<void> => {
  const params = DeleteBibleVersionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = deleteBibleVersion(params.data.versionId);
  if (!deleted) {
    res.status(404).json({ error: "Bible version not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/bible/stats", async (_req, res): Promise<void> => {
  const versions = listBibleVersions();
  const totalBooks = versions.reduce((sum, v) => sum + v.bookCount, 0);
  const totalVerses = versions.reduce((sum, v) => sum + v.verseCount, 0);

  res.json({
    totalVersions: versions.length,
    totalBooks,
    totalVerses,
    versions,
  });
});

export default router;
