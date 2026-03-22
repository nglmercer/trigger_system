FROM oven/bun:1 as base
WORKDIR /app

# Copy package.json and lockfile
COPY package.json bun.lock ./
COPY trigger-editor/package.json ./trigger-editor/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Set working directory to the web app
WORKDIR /app/trigger-editor

# Build step if needed (optional since bun runs it directly)
# RUN bun run build

# Expose the default port
EXPOSE 3000

# Start the editor server
CMD ["bun", "run", "index.ts"]
