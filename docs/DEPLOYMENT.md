# Deploying on a VM (Docker + Caddy, MongoDB on Atlas)

One VM runs two containers:

- **caddy**: serves the built frontend, forwards `/api` to the backend, and gets/renews HTTPS certificates.
- **backend**: the Node API. Not reachable from the internet; only Caddy talks to it.

MongoDB is on Atlas. Files: `docker-compose.yml`, `deploy/Caddyfile`, `deploy/caddy.Dockerfile`, `Backend/Dockerfile`.

---

## 0. Before touching the VM

**GCP**
1. VM: Ubuntu 22.04 or 24.04, e2-small (2 GB) is enough. When creating it, tick **Allow HTTP traffic** and **Allow HTTPS traffic** (opens ports 80 and 443).
2. VPC network → IP addresses → **reserve a static external IP** and attach it to the VM. (Otherwise the IP can change on restart, and your domain and Atlas access list break.)

**Domain**
- Point an **A record** for your domain (e.g. `sports.example.com`) to the static IP. Check with `nslookup sports.example.com`.
- No domain yet? Use `<ip-with-dashes>.sslip.io`, e.g. `34-93-12-7.sslip.io`. It resolves to that IP automatically, and Caddy can get a real certificate for it.

**MongoDB Atlas**
1. Cluster in the **same cloud and region as the VM** (e.g. GCP Mumbai for an asia-south1 VM).
2. Database Access → **add a user** for this app only, strong password, role "Read and write to any database".
3. Network Access → **add the VM's static IP** only (not 0.0.0.0/0).
4. Copy the connection string. Use a **fresh database name** for the event, e.g. `.../iiits_sports_prod?retryWrites=true&w=majority`.

---

## 1. Prepare the VM (once)

```bash
# SSH in, then:
sudo apt-get update && sudo apt-get upgrade -y

# Docker + the compose plugin (official install script)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit          # log out and SSH back in, so the docker group applies
docker --version && docker compose version

# 2 GB of swap: insurance against running out of memory during builds
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## 2. Get the code

```bash
cd ~
git clone https://github.com/JeevanVankadara/SportsWebSite-iiits.git
cd SportsWebSite-iiits
```
Private repository? Create a GitHub fine-grained token (read-only, this repo) and use it as the password when git asks.

## 3. Configuration (two files, never committed)

**`.env`** next to `docker-compose.yml`:
```bash
cat > .env <<'EOF'
DOMAIN=sports.example.com
VITE_ADMIN_PATH=/control-room
VITE_GOOGLE_CLIENT_ID=<the Google OAuth client ID>
EOF
```
Change `VITE_ADMIN_PATH` to something hard to guess if you like. It is built into the frontend, so changing it later means rebuilding.

**`Backend/.env`**:
```bash
JWT=$(openssl rand -hex 48)
cat > Backend/.env <<EOF
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/iiits_sports_prod?retryWrites=true&w=majority
JWT_SECRET=$JWT
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=<the Google OAuth client ID>
EOF
chmod 600 .env Backend/.env
nano Backend/.env        # paste your real Atlas connection string and the Google client ID
```
The Google client ID goes in both files (`VITE_GOOGLE_CLIENT_ID` above, `GOOGLE_CLIENT_ID` here). In Google Cloud Console, add `https://<domain>` to the client's **Authorized JavaScript origins**.
`PORT`, `TRUST_PROXY` and `CLIENT_ORIGIN` are set by `docker-compose.yml`. Don't add them here.

## 4. Start

```bash
docker compose up -d --build     # first build takes a few minutes
docker compose ps                # both "running"; backend "(healthy)"
docker compose logs -f           # Ctrl+C to stop following
```
In the backend log, look for `MongoDB connected` and `API listening`. In the Caddy log, look for `certificate obtained successfully`.

## 5. Create the super admin account

```bash
docker compose exec backend node src/scripts/seedAdmin.js
```
It asks for a username and password (hidden). This is the super admin; other admins are added from the **Admins** page of the admin dashboard. **Do not run `seed:reset` or the other seed scripts here**: `seed:reset` deletes the whole database, and the seed scripts create accounts whose passwords are written in the repository.

## 6. Check it works

```bash
curl -s https://sports.example.com/api/health                          # {"status":"ok"}
curl -sI https://sports.example.com/ | head -5                          # HTTP/2 200
curl -sN https://sports.example.com/api/kabaddi/fixtures/<id>/stream    # a live match: events arrive, not buffered
```
In a browser: open the site, sign in at `https://<domain>/control-room` (or your `VITE_ADMIN_PATH`), create the tournament, and run one mock match per sport with a coordinator on a phone.

---

## Everyday

| Task | Command |
|---|---|
| Deploy new code | `git pull && docker compose up -d --build` |
| Logs | `docker compose logs -f backend` (or `caddy`) |
| Restart | `docker compose restart` |
| Stop / start | `docker compose down` / `docker compose up -d` |
| Free disk after many builds | `docker image prune -f` |

The containers restart on their own after a crash or a VM reboot (`restart: unless-stopped`).

**Backups** (the Atlas free tier has none): before and after each event day, from any machine with the MongoDB tools:
```bash
mongodump --uri "mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/iiits_sports_prod" --out backup-$(date +%F)
```

## If something is wrong

- **No certificate / site not reachable**: the A record does not point at the VM yet, or ports 80/443 are closed in the GCP firewall. Caddy retries by itself; watch `docker compose logs -f caddy`.
- **Backend unhealthy, `Could not prepare the database`**: the VM's IP is not in Atlas Network Access, or the URI/password is wrong (special characters in the password must be URL-encoded).
- **Live scores only update on refresh**: something between the browser and Caddy is buffering (e.g. a CDN or proxy). With just Caddy as configured, streams are not buffered.
