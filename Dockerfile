FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@confpresence/api", "start"]
