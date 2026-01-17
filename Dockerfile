# ---- deps stage ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 依存関係＋ソース＋アセット
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY assets ./assets

# devDependencies を削る（sharpはdependenciesなので残る）
RUN npm prune --omit=dev

CMD ["node", "src/index.js"]
