# Solomon — AI Biblical Counselor

Solomon is an AI-powered preacher and counselor that answers every question with wisdom grounded in scripture. Users can have multi-turn conversations with Solomon, who searches the uploaded Bible versions for relevant passages and weaves them into every response.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/solomon run dev` — run the frontend (port 22232)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — auto-provisioned by Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, TanStack Query, wouter
- API: Express 5 (streaming SSE for AI responses)
- DB: PostgreSQL + Drizzle ORM (conversations + messages tables)
- AI: OpenAI gpt-5.4 via Replit AI Integrations (no user API key needed)
- Bible storage: JSON files on disk under `data/bibles/`
- File upload: multer (50 MB limit)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (conversations, messages)
- `artifacts/api-server/src/routes/openai/` — AI conversation routes
- `artifacts/api-server/src/routes/bible/` — Bible management routes
- `artifacts/api-server/src/lib/bible.ts` — Bible file loading, searching, stats
- `artifacts/api-server/src/lib/solomon.ts` — Solomon system prompt + context builder
- `artifacts/solomon/src/` — React frontend
- `data/bibles/` — Uploaded Bible JSON files (one `.meta.json` + `.data.json` per version)

## Architecture decisions

- Bible versions are stored as JSON files on disk (not in the DB) — keeps the DB lean and avoids large blob storage
- Bible search uses keyword matching to find relevant verses before each AI call — passages are injected into the system prompt context
- SSE streaming is used for the chat endpoint so Solomon's responses appear word-by-word
- Conversations are auto-titled from the first user message
- The frontend uses raw `fetch` for SSE (not generated hooks) since Orval can't type streaming responses

## Product

- Chat with Solomon — ask for counsel, biblical interpretation, or spiritual guidance; Solomon streams responses backed by scripture
- Bible Library — upload your downloaded Bible JSON files, view stats (books, verses), delete versions; Solomon searches all uploaded versions when answering

## Supported Bible JSON Format

```json
{
  "version": "KJV",
  "books": [
    {
      "name": "Genesis",
      "chapters": [
        {
          "chapter": 1,
          "verses": [
            { "verse": 1, "text": "In the beginning God created the heaven and the earth." }
          ]
        }
      ]
    }
  ]
}
```

Arrays of books (without a wrapper object) are also accepted.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Google Fonts `@import url(...)` must be the very first line in `index.css` — PostCSS fails silently otherwise
- SSE endpoints cannot use generated Orval hooks — call `fetch` + `ReadableStream` manually on the frontend
- The `data/bibles/` directory is created automatically at server startup if it doesn't exist
- Bible files can be large (KJV ≈ 4.5 MB) — the upload limit is set to 50 MB

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
