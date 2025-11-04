FROM node:20-bullseye-slim

# Install libraries required by headless Chromium
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

# Copy package manifests first to leverage Docker cache
COPY package*.json ./

# Ensure Puppeteer will download a compatible Chromium during npm ci
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=0

RUN npm ci --production

# Copy source
COPY . .

# Create unprivileged user
RUN groupadd -r app && useradd -r -g app app && chown -R app:app /app
USER app

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
