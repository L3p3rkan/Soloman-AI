# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./

# Lib package manifests
COPY lib/api-spec/package.json         lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-zod/package.json          lib/api-zod/
COPY lib/db/package.json               lib/db/
COPY lib/integrations/package.json     lib/integrations/
COPY lib/integrations-openai-ai-server/package.json  lib/integrations-openai-ai-server/
COPY lib/integrations-openai-ai-react/package.json   lib/integrations-openai-ai-react/

# Artifact manifests
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/solomon/package.json    artifacts/solomon/

# Install all workspace dependencies (cached when manifests unchanged)
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY lib/                   lib/
COPY artifacts/api-server/  artifacts/api-server/
COPY artifacts/solomon/     artifacts/solomon/

# Build composite TypeScript libs (api-zod, db, api-client-react, etc.)
RUN pnpm run typecheck:libs

# Build the React frontend.
# BASE_PATH=/ and a throwaway PORT are required by the Vite config at build time.
# The compiled static assets land in artifacts/solomon/dist/public/.
RUN PORT=3000 BASE_PATH=/ pnpm --filter @workspace/solomon run build

# Compile the API server via esbuild into artifacts/api-server/dist/
RUN pnpm --filter @workspace/api-server run build

# Create a self-contained production deployment tree (flattened node_modules,
# production deps only). pnpm deploy copies dist/ along with all other files.
RUN pnpm --filter @workspace/api-server deploy --prod /api-deploy

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:24-alpine AS final

WORKDIR /app

# Self-contained API server with flattened production node_modules
COPY --from=builder /api-deploy .

# Overwrite dist with the freshly compiled output (pnpm deploy copies the
# package directory as-is; being explicit avoids stale-cache surprises).
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Pre-built web frontend — served as static files by the API process
COPY --from=builder /app/artifacts/solomon/dist/public ./public

# PORT         — TCP port the server listens on
# NODE_ENV     — disables dev-only middleware
# PUBLIC_DIR   — tells the API server to serve the web frontend statically
ENV PORT=8080 \
    NODE_ENV=production \
    PUBLIC_DIR=/app/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
