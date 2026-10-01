# Builds the frontend, then serves it with Caddy. Build context: the repository root.

# 1. Build the frontend once. It is plain files after this; no Node process runs in production.
FROM node:22-slim AS frontend
WORKDIR /build
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci
COPY Frontend/ ./
# Empty API URL = same origin: the page calls /api on its own domain, which Caddy forwards.
ARG VITE_ADMIN_PATH=/control-room
# Public OAuth client ID for the Google sign-in button (same as GOOGLE_CLIENT_ID in Backend/.env).
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_URL="" VITE_ADMIN_PATH=${VITE_ADMIN_PATH} VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

# 2. Caddy with the built files and the config.
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend /build/dist /srv
