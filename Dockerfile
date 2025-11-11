### ---------------------------------------------------------------------------
### Stage 1: Build client & install dependencies
### ---------------------------------------------------------------------------
FROM node:20-bullseye-slim AS build

# Install libs required by headless Chromium (Puppeteer)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root manifests (will trigger server postinstall to install its deps)
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=0

# Install root dependencies (includes server via postinstall) then client deps
RUN npm ci --omit=dev \
    && npm --prefix client install --omit=dev

# Copy client source files needed for build
COPY client ./client

# Build client
RUN npm --prefix client run build

# ---------------------------------------------------------------------------
# Stage 2: Production image
# ---------------------------------------------------------------------------
FROM node:20-bullseye-slim AS prod
WORKDIR /app

# Copy only necessary runtime files
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
COPY server ./server

# Copy built client into server/public for static serving
COPY --from=build /app/client/build ./server/public

# Create unprivileged user
RUN groupadd -r app && useradd -r -g app app && chown -R app:app /app
USER app

ENV NODE_ENV=production

EXPOSE 5050
CMD ["node", "server/index.js"]
