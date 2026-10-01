# Mony API image. Build from the repo root — the API needs the pnpm
# workspace (lockfile, packages/shared-types):
#   docker build -f apps/api/Dockerfile -t mony-api .
FROM node:22-bookworm-slim

# Prisma's query engine links against OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Same pnpm as package.json "packageManager".
RUN npm install -g pnpm@11.7.0

WORKDIR /repo
COPY . .

# Only the API and the workspace packages it depends on. Dev dependencies
# stay: the Prisma CLI runs the migrations when the container starts.
RUN pnpm install --frozen-lockfile --filter "@mony/api..."

# At runtime the API loads @mony/shared-types from its dist/ (the "node"
# export), so it's built first.
RUN pnpm --filter @mony/api exec prisma generate \
  && pnpm --filter @mony/shared-types build \
  && pnpm --filter @mony/api build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /repo/apps/api
# Pending migrations first, then the server (exec: node gets the stop signal).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
