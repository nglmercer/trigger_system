FROM node:18-bullseye-slim

WORKDIR /app

# Install bun
RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"

# Copy root package files
COPY package.json .
COPY bun.lock .

# Copy trigger-editor package files
COPY trigger-editor/package.json ./trigger-editor/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

WORKDIR /app/trigger-editor

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
