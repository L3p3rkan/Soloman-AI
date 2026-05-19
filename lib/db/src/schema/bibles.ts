import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const bibles = pgTable("bibles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  bookCount: integer("book_count").notNull().default(0),
  verseCount: integer("verse_count").notNull().default(0),
  booksData: jsonb("books_data").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Bible = typeof bibles.$inferSelect;
export type InsertBible = typeof bibles.$inferInsert;
