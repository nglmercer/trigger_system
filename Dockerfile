FROM node:18-bullseye-slim

WORKDIR /app

# Install bun
RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"

# Copy all source files (node_modules excluded via .dockerignore)
COPY . .

# Install root package dependencies (yaml, arktype, etc.)
# Required because trigger-editor imports directly from ../src/
RUN bun install

# Install trigger-editor dependencies
WORKDIR /app/trigger-editor
RUN bun install

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
