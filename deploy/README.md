# Linux VM Deployment

This folder contains application-side deployment templates for a single Linux VM.
The assumed topology is:

- Nginx serves `frontend/dist`.
- Nginx proxies `/api/*` to the NestJS backend on `127.0.0.1:3000`.
- The backend runs as a systemd service.
- MySQL is reachable from the VM through `DATABASE_URL`.

Replace every placeholder before using these commands in production.

## VM Prerequisites

- Node.js and npm installed.
- Nginx installed.
- Git installed.
- MySQL database created and reachable.
- A non-root application user, for example `compania`.
- Firewall allows HTTP/HTTPS traffic and does not expose the backend port publicly.

## First Deployment

Clone the repository into the deployment path:

```bash
sudo mkdir -p /opt/compania_service
sudo chown -R compania:compania /opt/compania_service
sudo -u compania git clone <repo-url> /opt/compania_service
```

Prepare the backend:

```bash
cd /opt/compania_service/backend
cp .env.production.example .env
nano .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Prepare the frontend:

```bash
cd /opt/compania_service/frontend
cp .env.production.example .env.production
nano .env.production
npm ci
npm run build
```

Install the backend service:

```bash
sudo cp /opt/compania_service/deploy/systemd/compania-backend.service.example /etc/systemd/system/compania-backend.service
sudo nano /etc/systemd/system/compania-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now compania-backend
```

Install the Nginx site:

```bash
sudo cp /opt/compania_service/deploy/nginx/compania-service.conf.example /etc/nginx/sites-available/compania-service
sudo nano /etc/nginx/sites-available/compania-service
sudo ln -s /etc/nginx/sites-available/compania-service /etc/nginx/sites-enabled/compania-service
sudo nginx -t
sudo systemctl reload nginx
```

## Verification

Check the backend locally:

```bash
curl http://127.0.0.1:3000/api/health
```

Check the public route through Nginx:

```bash
curl http://your-domain.example/api/health
```

Expected response:

```json
{"status":"ok","timestamp":"2026-06-08T00:00:00.000Z"}
```

Open `http://your-domain.example` and confirm the frontend loads data through `/api`.

## Routine Updates

Back up the database before running migrations.

```bash
cd /opt/compania_service
sudo -u compania git pull

cd /opt/compania_service/backend
sudo -u compania npm ci
sudo -u compania npx prisma generate
sudo -u compania npx prisma migrate deploy
sudo -u compania npm run build
sudo systemctl restart compania-backend

cd /opt/compania_service/frontend
sudo -u compania npm ci
sudo -u compania npm run build
sudo systemctl reload nginx
```

Re-run the health checks after every deployment.

## HTTPS

Add HTTPS before exposing the app beyond a private network. A typical VM setup uses
Certbot with Nginx:

```bash
sudo certbot --nginx -d your-domain.example
```

After HTTPS is enabled, update `backend/.env`:

```bash
CORS_ORIGIN="https://your-domain.example"
```

Then restart the backend:

```bash
sudo systemctl restart compania-backend
```
