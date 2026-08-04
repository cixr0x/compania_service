# Production Deployment Runbook

This is the authoritative runbook for the current Compania production environment. Read it before any production inspection or deployment. Do not reconstruct a deployment from the old `/opt/compania_service` checkout assumption.

## Current Production Topology

| Item | Current value |
| --- | --- |
| GCP project | `crypto-matic` |
| VM | `compania` |
| Zone | `us-central1-b` |
| Public URL | `https://compania.bobbycrimson.com` |
| Git checkout | `/home/robertorojas87/compania_service` |
| Checkout owner | `robertorojas87` |
| Backend service user/group | `compania:compania` |
| Backend service | `compania-backend.service` |
| Backend working directory | `/home/robertorojas87/compania_service/backend` |
| Backend environment file | `/opt/compania_service/backend/.env` |
| Backend listener | `127.0.0.1:3000` |
| Frontend document root | `/home/robertorojas87/compania_service/frontend/dist` |
| Nginx site | `/etc/nginx/sites-enabled/compania-service` |

Nginx serves the frontend, proxies `/api/*` to the loopback-only NestJS backend, redirects HTTP to HTTPS, and uses Certbot-managed certificates.

The checkout path and environment path are intentionally different. `/opt/compania_service` is not the Git deployment checkout. Do not run `git pull`, `npm ci`, or builds there.

## Last Verified Baseline

The production runtime was last verified on August 3, 2026 (August 4 UTC):

- Runtime commit: `8b9cf0701ff9fd2c7c908314390eb32ec3fbd306`.
- VM checkout clean at that commit.
- Backend and Nginx active.
- All 23 Prisma migrations applied.
- Loopback and public HTTPS health checks returned HTTP 200.
- Editable and printable stakeholder report routes were exercised with real read-only production data.
- The project edit screen exposed the Fixed ROI control.

Documentation-only commits created after that verification do not change the runtime and do not require an immediate production rebuild. Always re-check the live SHA and GitHub head instead of assuming this dated baseline is still current.

## Mandatory Safety Rules

Before a deployment:

1. Confirm the intended local revision is committed and pushed.
2. Record the full expected commit SHA.
3. Confirm the VM checkout is clean.
4. Confirm a recoverable production database snapshot exists.
5. Run `prisma migrate status` read-only.
6. If migrations are pending, show the user the exact SQL from every pending migration and obtain explicit approval before `prisma migrate deploy`.

Never run `prisma migrate dev` against production. Never print, copy into chat, or commit the contents of either production `.env` file.

Do not apply `npm audit fix`, package upgrades, or unrelated cleanup during deployment. Audit and engine warnings are non-blocking only when dependency installation, builds, and runtime checks pass.

## Local Preflight

From `C:\PROJECTS\compania_service` in PowerShell:

```powershell
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main
gcloud compute instances describe compania `
  --project crypto-matic `
  --zone us-central1-b `
  --format="get(status)"
```

The local commit and GitHub `main` must match the intended deployment revision. Preserve unrelated local files such as `importtest1.xlsx`.

## Read-Only VM Preflight

Connect from PowerShell:

```powershell
gcloud compute ssh compania `
  --project crypto-matic `
  --zone us-central1-b
```

On the VM:

```bash
set -euo pipefail
CHECKOUT=/home/robertorojas87/compania_service

sudo -n -u robertorojas87 \
  git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" status --short
sudo -n -u robertorojas87 \
  git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" rev-parse HEAD
sudo -n -u robertorojas87 \
  git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" ls-remote origin refs/heads/main

systemctl is-active compania-backend
systemctl is-active nginx
df -h /
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
```

Stop if the worktree is dirty, the current revision is unexpected, either service is unhealthy, or disk headroom is insufficient. As of the August 2026 rollout, the VM was near 90% disk use. Duplicate dependency folders under `/opt/compania_service` are not used by the active service, but they must not be removed without explicit approval and a fresh path/process verification.

### Read-only migration status

Run Prisma as the service user with the active environment. The `sed` step removes Windows carriage returns from the environment file before Bash reads it.

```bash
sudo -n -u compania bash <<'EOF'
set -euo pipefail
set -a
source <(sed 's/\r$//' /opt/compania_service/backend/.env)
set +a
cd /home/robertorojas87/compania_service/backend
./node_modules/.bin/prisma migrate status
EOF
```

This status command is read-only. Do not proceed to migration deployment until the snapshot and SQL approvals are documented.

## Deployment

Set the expected SHA before changing the checkout:

```bash
set -euo pipefail
CHECKOUT=/home/robertorojas87/compania_service
EXPECTED_COMMIT=<full-approved-sha>
```

### 1. Pull the exact Git revision

```bash
sudo -n -u robertorojas87 \
  git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" pull --ff-only origin main

test "$(sudo -n -u robertorojas87 git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" rev-parse HEAD)" = "$EXPECTED_COMMIT"
```

Stop if the pulled revision is not the approved SHA.

### 2. Install and build the backend

```bash
sudo -n -u robertorojas87 bash -lc '
  set -euo pipefail
  cd /home/robertorojas87/compania_service/backend
  npm ci
  npx prisma generate
  npm run build
'
```

### 3. Install and build the frontend

```bash
sudo -n -u robertorojas87 bash -lc '
  set -euo pipefail
  cd /home/robertorojas87/compania_service/frontend
  npm ci
  env VITE_API_BASE_URL=/api npm run build
'
```

The explicit API base prevents a local development URL from being embedded in the production bundle.

### 4. Verify backend environment-file access

The application loads `.env` from its working directory even though systemd also supplies `/opt/compania_service/backend/.env`. The two files must remain identical, and the service account must be able to read the checkout copy.

```bash
sudo -n cmp -s \
  /home/robertorojas87/compania_service/backend/.env \
  /opt/compania_service/backend/.env

sudo -n chgrp compania /home/robertorojas87/compania_service/backend/.env
sudo -n chmod 640 /home/robertorojas87/compania_service/backend/.env
sudo -n stat -c '%a %U:%G' /home/robertorojas87/compania_service/backend/.env
```

Expected metadata is `640 robertorojas87:compania`. If `cmp` fails, stop; do not overwrite either environment file automatically.

### 5. Apply approved migrations

Only after the database snapshot and exact SQL are approved:

```bash
sudo -n -u compania bash <<'EOF'
set -euo pipefail
set -a
source <(sed 's/\r$//' /opt/compania_service/backend/.env)
set +a
cd /home/robertorojas87/compania_service/backend
./node_modules/.bin/prisma migrate deploy
EOF
```

### 6. Validate configuration and restart

```bash
sudo -n nginx -t
sudo -n systemctl restart compania-backend
sudo -n systemctl reload nginx
```

Allow up to 60 seconds for the backend to initialize. Retry the loopback health check rather than assuming an immediate failure.

```bash
for attempt in $(seq 1 30); do
  curl --fail --silent --show-error http://127.0.0.1:3000/api/health && break
  sleep 2
done
```

## Post-deployment Verification

On the VM:

```bash
CHECKOUT=/home/robertorojas87/compania_service

sudo -n -u robertorojas87 \
  git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" rev-parse HEAD
sudo -n -u robertorojas87 \
  git -c safe.directory="$CHECKOUT" -C "$CHECKOUT" status --short
systemctl is-active compania-backend
systemctl is-active nginx
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
```

Re-run the read-only migration-status command and require `Database schema is up to date!`.

From the operator machine:

```powershell
curl.exe -sS https://compania.bobbycrimson.com/api/health
curl.exe -sS -I https://compania.bobbycrimson.com/
curl.exe -sS -I https://compania.bobbycrimson.com/reports/stakeholder-projects
```

Confirm that connecting directly to the VM's public IP on port `3000` times out or is rejected.

For UI changes, verify the actual production interaction in a browser. At minimum:

1. Open the changed screen.
2. Exercise the relevant filters or selectors with real read-only data.
3. Confirm the expected fields and links.
4. Open the print route when report printing changed.
5. Do not save or delete production business data without separate authorization.

## Troubleshooting

### Backend restart loop with `.env` permission denied

Inspect the journal:

```bash
sudo -n journalctl -u compania-backend --since '10 minutes ago' --no-pager -n 160
```

If the error is `EACCES` for `/home/robertorojas87/compania_service/backend/.env`, first prove that its SHA-256 hash matches `/opt/compania_service/backend/.env`. If they match, restore group `compania` and mode `640`, then restart. Never print the file contents.

### Dependency or build failure

Do not restart the service or apply migrations when either build fails. Report the exact failing command. Do not start a second deployment while an `npm ci` or build is still running.

### Rollback

A Git rollback does not roll back the database. Do not reverse migrations or restore a database without separate approval and a tested recovery plan. If a code rollback is needed, first confirm the earlier revision is compatible with every migration already applied, then deploy that explicitly approved revision through the same build and verification procedure.

## Production Configuration Files

- Systemd: `/etc/systemd/system/compania-backend.service`
- Nginx: `/etc/nginx/sites-enabled/compania-service`
- Certbot certificate: `/etc/letsencrypt/live/compania.bobbycrimson.com/`
- Backend environment: `/opt/compania_service/backend/.env`

Routine application deployments should not overwrite systemd, Nginx, Certbot, or environment files. Inspect and change them only when the task explicitly includes infrastructure configuration.
