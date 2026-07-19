# Nexus AI

> A cross-platform AI assistant built with Expo, FastAPI, and DeepSeek. It provides AI chat, note generation, and conversation management.

<p align="center">
  <img src="https://img.shields.io/badge/frontend-Expo_56-000?logo=expo" alt="Expo 56">
  <img src="https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/LLM-DeepSeek-536DFE?logo=openai" alt="DeepSeek">
  <img src="https://img.shields.io/badge/database-PostgreSQL_16_+_pgvector-4169E1?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

---

## Features

| Area | Description |
|------|-------------|
| **AI Chat** | Multi-conversation management with SSE streaming and DeepSeek integration. |
| **Note Generation** | Generate structured Markdown notes from chat content with AI. |
| **Authentication** | Registration, login, automatic token refresh, and JWT access/refresh tokens. |
| **Cross-platform** | A consistent experience on Android, iOS, and the web. |

## Architecture

```text
┌─────────────────────────────────┐
│ Frontend (app/)                 │
│ Expo SDK 56 · React Native 0.85 │
│ Expo Router · Zustand           │
└──────────────┬──────────────────┘
               │ SSE / REST (Axios)
┌──────────────▼──────────────────┐
│ Backend (backend/)              │
│ FastAPI · SQLAlchemy 2.0        │
│ PostgreSQL + pgvector · Redis   │
│ MinIO · DeepSeek LLM            │
└─────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Docker Desktop** for backend infrastructure.
- **Node.js** 18 or later for the frontend.
- Python, PostgreSQL, and Redis do not need to be installed locally when using Docker.

### 1. Start the backend

```bash
cd backend
cp .env.example .env
# Edit .env and replace every placeholder with a secure value.
docker compose up -d

# Run database migrations on the first startup.
docker compose exec api alembic revision --autogenerate -m "init"
docker compose exec api alembic upgrade head
```

Verify the service:

```bash
curl http://localhost:8001/api/v1/health
```

The expected response is `{"status":"ok","db":"ok","redis":"ok"}`. API documentation is available at [http://localhost:8001/docs](http://localhost:8001/docs).

### 2. Start the frontend

```bash
cd app
cp .env.example .env
npm install
npx expo start --web
```

Set `EXPO_PUBLIC_API_URL` in `app/.env` to the backend API URL, for example `http://localhost:8001/api/v1`.

### 3. Register and sign in

Open the frontend, create an account with a password of at least eight characters, and you will be redirected to the AI chat page.

For detailed setup instructions and troubleshooting, see [backend/SETUP.md](backend/SETUP.md).

## Project Structure

```text
nexus/
├── app/                        # Expo cross-platform frontend
│   ├── src/app/                # Expo Router pages
│   ├── src/components/         # Reusable UI components
│   ├── src/services/           # API layer (Axios + SSE)
│   ├── src/stores/             # Zustand state stores
│   ├── src/types/              # TypeScript type definitions
│   └── src/hooks/              # Custom hooks
├── backend/                    # FastAPI backend
│   ├── src/api/v1/             # REST and SSE routes
│   ├── src/application/        # Application services
│   ├── src/domain/             # Domain models and schemas
│   └── src/infra/              # Database, Redis, LLM, and other infrastructure
└── .github/                    # GitHub configuration
```

## Technology Stack

| Layer | Frontend | Backend |
|---|------|------|
| **Framework** | Expo SDK 56 + React Native 0.85 | FastAPI (async) |
| **Language** | TypeScript 6.0 | Python 3.12 |
| **Routing** | Expo Router | APIRouter |
| **State / ORM** | Zustand | SQLAlchemy 2.0 + asyncpg |
| **HTTP / Streaming** | Axios + SSE | uvicorn + SSE |
| **Validation** | — | Pydantic v2 |
| **Database** | — | PostgreSQL 16 + pgvector |
| **Cache** | — | Redis 7 |
| **Object Storage** | — | MinIO (S3-compatible) |
| **LLM** | — | DeepSeek via the OpenAI-compatible API |
| **Migrations** | — | Alembic |
| **Package Manager** | npm | uv |

## Subproject Documentation

| Directory | Documentation |
|------|---------------|
| [app/README.md](app/README.md) | Frontend stack, project structure, and conventions. |
| [backend/README.md](backend/README.md) | API endpoints, architecture, environment variables, and tests. |
| [backend/SETUP.md](backend/SETUP.md) | Development setup, integration configuration, and troubleshooting. |

## License

MIT
