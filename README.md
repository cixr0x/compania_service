# Compania Service

Enterprise web application for managing products, projects, stakeholders, and staged sales imports.

Project design is documented in [docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md](docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md).

## Projects

- `backend/`: NestJS REST API with Prisma and MySQL.
- `frontend/`: React Vite webapp.

## Local Setup

1. Fill `backend/.env` with MySQL credentials. If it does not exist, copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Install backend dependencies with `npm.cmd install` inside `backend/`.
4. Install frontend dependencies with `npm.cmd install` inside `frontend/`.
5. Run backend tests with `npm.cmd test`.
6. Run frontend verification with `npm.cmd run build`.

Use `npm.cmd` from PowerShell on Windows.

## Development Commands

Backend:

```powershell
Set-Location backend
npm.cmd run start:dev
```

Frontend:

```powershell
Set-Location frontend
npm.cmd run dev -- --host 127.0.0.1
```

Local development database migration:

```powershell
Set-Location backend
npx.cmd prisma migrate dev --name init
```

Staging or production database migration:

```powershell
Set-Location backend
npx.cmd prisma migrate deploy
```

Run migration commands after `backend\.env` contains the real MySQL `DATABASE_URL`.

## Database Connection

`backend/.env` is gitignored and is the local place to enter the development MySQL connection details. The required runtime value is:

```powershell
DATABASE_URL="mysql://<mysql_user>:<mysql_password>@<mysql_host>:3306/<database_name>"
```

The current local development database is `compania_dev`. Keep production credentials out of `backend/.env`; use a separate gitignored file such as `backend/.env.production.local` for operator reference when needed. Apply migrations to the database selected by `backend/.env`.

After filling it in, run:

```powershell
Set-Location backend
npx.cmd prisma generate
npx.cmd prisma migrate dev --name init
npm.cmd run start:dev
```

The API should then be available at `http://localhost:3000/api`.

## Production Deployment

Linux VM deployment templates and the deployment runbook are in [deploy/README.md](deploy/README.md).

Production build commands:

```powershell
Set-Location backend
npm.cmd ci
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run build
```

```powershell
Set-Location frontend
npm.cmd ci
$env:VITE_API_BASE_URL="/api"
npm.cmd run build
Remove-Item Env:VITE_API_BASE_URL
```

The backend exposes a health check at `/api/health` for service and reverse proxy verification.
Production frontend builds default to same-origin `/api`; setting `VITE_API_BASE_URL="/api"` explicitly prevents accidentally embedding a local development API URL.
