FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock ./
COPY trigger-editor/package.json ./trigger-editor/

RUN bun install --frozen-lockfile

COPY . .

WORKDIR /app/trigger-editor

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
