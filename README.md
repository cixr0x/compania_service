# Compania Service

Enterprise web application for managing products, projects, stakeholders, and staged sales imports.

Project design is documented in [docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md](docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md).

## Projects

- `backend/`: NestJS REST API with Prisma and MySQL.
- `frontend/`: React Vite webapp.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env` and set MySQL credentials.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Install backend dependencies with `npm.cmd install` inside `backend/`.
4. Install frontend dependencies with `npm.cmd install` inside `frontend/`.
5. Run backend tests with `npm.cmd test`.
6. Run frontend tests with `npm.cmd test`.

Use `npm.cmd` from PowerShell on Windows.
