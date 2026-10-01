# The API. Runs behind Caddy (see docker-compose.yml); never exposed to the internet directly.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install only runtime dependencies, from the lockfile, before copying the code (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Don't run as root inside the container.
USER node
EXPOSE 4000
CMD ["node", "server.js"]
