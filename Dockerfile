# ── Stage 1: Build ────────────────────────────────────────────────────────────
# IMPORTANT: use the glibc-based slim image, NOT alpine.
# The pnpm lockfile records linux-x64 (glibc) binaries for esbuild,
# lightningcss, and @tailwindcss/oxide. Alpine uses musl, which is
# incompatible — those prebuilt binaries will segfault or be missing.
FROM node:24-slim AS builder

# Install the exact pnpm version that generated pnpm-lock.yaml (lockfileVersion 9.0 = pnpm 10).
# corepack enable alone uses the bundled default (pnpm 9.x), which cannot read this lockfile.
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

# ── Workspace manifests (expensive layer — cache-busted only on manifest changes) ──
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./

# lib packages
COPY lib/api-spec/package.json                      lib/api-spec/
COPY lib/api-client-react/package.json              lib/api-client-react/
COPY lib/api-zod/package.json                       lib/api-zod/
COPY lib/db/package.json                            lib/db/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/
COPY lib/integrations-openai-ai-react/package.json  lib/integrations-openai-ai-react/

# artifact packages (all four must be present for pnpm to honour the lockfile)
COPY artifacts/api-server/package.json     artifacts/api-server/
COPY artifacts/solomon/package.json        artifacts/solomon/
COPY artifacts/solomon-mobile/package.json artifacts/solomon-mobile/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/

# scripts package
COPY scripts/package.json scripts/

# ── Install all workspace dependencies ───────────────────────────────────────
RUN pnpm install --frozen-lockfile

# ── Source files ─────────────────────────────────────────────────────────────
# Only the packages we actually need to build
COPY lib/                  lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY artifacts/solomon/    artifacts/solomon/
COPY scripts/              scripts/

# ── Build composite TypeScript libs ──────────────────────────────────────────
RUN pnpm run typecheck:libs

# ── Build web frontend ────────────────────────────────────────────────────────
# PORT and BASE_PATH are validated by vite.config.ts at build time.
# BASE_PATH=/ serves the frontend from the root path in Docker.
RUN PORT=3000 BASE_PATH=/ pnpm --filter @workspace/solomon run build

# ── Bundle API server ─────────────────────────────────────────────────────────
RUN pnpm --filter @workspace/api-server run build

# ── Self-contained production deployment ─────────────────────────────────────
# pnpm deploy copies the package + its production node_modules (flattened,
# no symlinks) to /api-deploy — safe to COPY into the next stage.
# pnpm v10 requires --legacy for the traditional deploy behaviour in workspaces
RUN pnpm --filter @workspace/api-server deploy --prod --legacy /api-deploy

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
# Alpine is fine here — we only run pre-built JS, no native tool binaries.
FROM node:24-alpine AS final

WORKDIR /app

# Flattened production deployment (package.json + node_modules)
COPY --from=builder /api-deploy .

# Compiled API bundle (esbuild output + pino workers)
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Pre-built web frontend — served statically by the API process via PUBLIC_DIR
COPY --from=builder /app/artifacts/solomon/dist/public ./public

# PORT       — TCP port the server listens on
# NODE_ENV   — disables dev-only middleware
# PUBLIC_DIR — tells app.ts to serve ./public as a static SPA
ENV PORT=8090 \
    NODE_ENV=production \
    PUBLIC_DIR=/app/public

EXPOSE 8090

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
