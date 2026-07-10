# Nexus AI / Pick — 全栈 AI 助手

> Expo 跨平台前端 + FastAPI 后端 + DeepSeek LLM，提供 AI 对话、笔记生成、会话管理。

<p align="center">
  <img src="https://img.shields.io/badge/frontend-Expo_56-000?logo=expo" alt="Expo 56">
  <img src="https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/LLM-DeepSeek-536DFE?logo=openai" alt="DeepSeek">
  <img src="https://img.shields.io/badge/database-PostgreSQL_16_+_pgvector-4169E1?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

---

## ✨ 功能

| 模块 | 说明 |
|------|------|
| **AI 对话** | 多会话管理，SSE 流式输出，接入 DeepSeek LLM |
| **笔记生成** | 从对话内容 AI 自动生成结构化 Markdown 笔记 |
| **用户系统** | 注册 / 登录 / Token 自动刷新，JWT 双 Token 机制 |
| **跨平台** | Android / iOS / Web 三端统一体验 |

## 🏗 架构

```
┌─────────────────────────────────┐
│  前端 (app/)                     │
│  Expo SDK 56 · RN 0.85          │
│  Expo Router · Zustand          │
└──────────────┬──────────────────┘
               │ SSE / REST (Axios)
┌──────────────▼──────────────────┐
│  后端 (backend/)                 │
│  FastAPI · SQLAlchemy 2.0       │
│  ┌──────────┬──────────┐        │
│  │PostgreSQL│  Redis   │ MinIO  │
│  │+pgvector │ 缓存/会话 │ 对象存储│
│  └──────────┴──────────┘        │
│         DeepSeek LLM            │
└─────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- **Docker Desktop**（运行后端基础设施）
- **Node.js** ≥ 18（前端）
- 无需本地安装 Python、PostgreSQL、Redis

### 1. 启动后端

```bash
cd backend
cp .env.example .env          # 编辑 .env，填入 LLM API Key
docker compose up -d           # 启动 PostgreSQL + Redis + MinIO + API

# 首次运行需执行数据库迁移
docker compose exec api alembic revision --autogenerate -m "init"
docker compose exec api alembic upgrade head
```

验证：`curl http://localhost:8001/api/v1/health` → `{"status":"ok","db":"ok","redis":"ok"}`

Swagger 文档：浏览器打开 [http://localhost:8001/docs](http://localhost:8001/docs)

### 2. 启动前端

```bash
cd app
npm install
npx expo start --web           # Web 模式，浏览器自动打开
```

### 3. 注册 / 登录

打开前端页面 → 注册账号（密码至少 8 位）→ 自动跳转至 AI 对话页。

> 详细环境搭建（含故障排查）见 [backend/SETUP.md](backend/SETUP.md)。

## 📁 项目结构

```
nexus/
├── app/                        # 前端：Expo 跨平台应用
│   ├── src/app/                #   Expo Router 页面（文件路由）
│   ├── src/components/         #   可复用 UI 组件
│   ├── src/services/           #   API 层（Axios + SSE）
│   ├── src/stores/             #   Zustand 状态管理
│   ├── src/types/              #   TypeScript 类型定义
│   └── src/hooks/              #   自定义 Hooks
├── backend/                    # 后端：FastAPI 服务
│   ├── src/api/v1/             #   路由层（REST + SSE）
│   ├── src/application/        #   业务逻辑层
│   ├── src/domain/             #   领域层（ORM + Schema）
│   └── src/infra/              #   基础设施层（DB/Redis/LLM）
└── .github/workflows/          # CI/CD：自动部署
```

## 🛠 技术栈

| 层 | 前端 | 后端 |
|---|------|------|
| **框架** | Expo SDK 56 + React Native 0.85 | FastAPI (async) |
| **语言** | TypeScript 6.0 | Python 3.12 |
| **路由** | Expo Router（文件路由） | APIRouter |
| **状态 / ORM** | Zustand | SQLAlchemy 2.0 + asyncpg |
| **HTTP / 通信** | Axios + SSE | uvicorn + SSE |
| **数据校验** | — | Pydantic v2 |
| **数据库** | — | PostgreSQL 16 + pgvector |
| **缓存** | — | Redis 7 |
| **对象存储** | — | MinIO (S3 兼容) |
| **LLM** | — | DeepSeek (OpenAI 协议) |
| **迁移** | — | Alembic |
| **包管理** | npm | uv |

## 🚢 部署

推送到 `main` 分支自动触发 GitHub Actions：

| 变更目录 | 动作 |
|----------|------|
| `backend/**` | self-hosted runner 上 Docker 构建并重启 |
| `app/**` | EAS Update 推送 OTA 热更新到 preview 频道 |

详见 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。

## 📖 子项目文档

| 目录 | 说明 |
|------|------|
| [app/README.md](app/README.md) | 前端技术栈、项目结构、关键约定 |
| [backend/README.md](backend/README.md) | API 端点详情、架构设计、环境变量、测试 |
| [backend/SETUP.md](backend/SETUP.md) | 开发环境搭建、联调配置、故障排查 |

## 📄 许可证

MIT
