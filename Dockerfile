FROM node:18-bullseye-slim

WORKDIR /app

# Install bun
RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"

# Copy trigger-editor package files for dependency install layer caching
COPY trigger-editor/package.json ./trigger-editor/
COPY trigger-editor/bun.lock ./trigger-editor/

# Install trigger-editor dependencies
WORKDIR /app/trigger-editor
RUN bun install

# Copy the rest of the trigger-editor source
WORKDIR /app
COPY trigger-editor/ ./trigger-editor/

WORKDIR /app/trigger-editor

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
