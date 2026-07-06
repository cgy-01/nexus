# Nexus AI — 开发环境搭建指南

本文档包含后端（FastAPI）和前端（Expo React Native）的完整启动流程，以及踩坑记录。

---

## 前置要求

- **Docker Desktop**（Windows 需 v26+）
- **Node.js** ≥ 18（用于前端 Expo 项目）
- 无需本地安装 Python、PostgreSQL、Redis、MinIO

---

## 项目概览

```
nexus/
├── app/          # 前端：Expo SDK 56 + React Native 0.85
├── backend/      # 后端：FastAPI + PostgreSQL + Redis + MinIO + DeepSeek
└── .github/      # CI/CD：GitHub Actions 自动部署
```

---

## 一、后端启动

### 1. 进入目录

```bash
cd backend
```

### 2. 启动所有服务

```bash
docker compose up -d
```

首次运行会拉取镜像并构建 API 容器。Docker Compose 启动 4 个服务：

| 服务 | 镜像 | 端口 | 说明 |
|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg16` | 5432 | PostgreSQL 16 + pgvector 向量扩展 |
| `redis` | `redis:7-alpine` | 6379 | Redis 7（缓存 / 会话） |
| `minio` | `minio/minio:latest` | 9000（API）、9001（控制台） | S3 兼容对象存储 |
| `api` | 本地构建（Dockerfile.dev） | 8001 → 容器内 8000 | FastAPI（热重载） |

看到 4 个 `✔` 即为成功：

```
✔ Container backend-redis-1     Healthy
✔ Container backend-postgres-1  Healthy
✔ Container backend-minio-1     Healthy
✔ Container backend-api-1       Started
```

### 3. 运行数据库迁移

> **重要**：首次启动必须先生成迁移文件再升级，因为 `alembic/versions/` 目录初始为空。

```bash
# 生成初始迁移文件
docker compose exec api alembic revision --autogenerate -m "init"

# 应用到数据库
docker compose exec api alembic upgrade head
```

如果之前跑过迁移，只需：

```bash
docker compose exec api alembic upgrade head
```

### 4. 验证

```bash
# 健康检查（PowerShell）
Invoke-WebRequest -Uri http://localhost:8001/api/v1/health -Method GET -TimeoutSec 5

# 应返回: {"status":"ok","db":"ok","redis":"ok"}
```

Swagger 文档：浏览器打开 `http://localhost:8001/docs`

---

## 二、后端服务架构

### 热重载

`src/`、`alembic/` 等目录通过 Docker volume 挂载进容器，修改 Python 代码后容器自动重启。

### 服务地址

| 服务 | URL |
|---|---|
| API | `http://localhost:8001` |
| Swagger 文档 | `http://localhost:8001/docs` |
| OpenAPI JSON | `http://localhost:8001/openapi.json` |
| MinIO 控制台 | `http://localhost:9001`（minioadmin / minioadmin） |

### 三层架构

```
api/v1/     →  路由层（参数提取、依赖注入）
application/ →  业务逻辑层（编排模型和基础设施）
domain/     →  领域层（ORM 模型 + Pydantic Schema）
infra/      →  基础设施层（数据库、Redis、LLM、安全）
```

---

## 三、前端启动

### 1. 进入目录

```bash
cd app
```

### 2. 安装依赖（如果还没装）

```bash
npm install
```

### 3. 配置 API 地址

在 `app/src/services/api.ts` 中修改 `SERVER_HOST`：

```typescript
// 本地开发
export const SERVER_HOST = 'http://localhost:8001';

// 连接内测服务器
export const SERVER_HOST = 'http://121.41.31.221:8001';
```

### 4. 启动 Web 模式

```bash
npx expo start --web
```

浏览器会自动打开 `http://localhost:8081`，进入登录页。

### 5. 注册 / 登录

- 密码要求：**至少 8 位**
- 注册成功后自动跳转至聊天页

---

## 四、前后端联调配置

### 前端 API 地址

在 `app/src/services/api.ts` 中：

```typescript
export const SERVER_HOST = 'http://localhost:8001';
const BASE_URL = `${SERVER_HOST}/api/v1`;
```

Axios 实例自动处理：
- **请求拦截器**：自动附加 `Authorization: Bearer <access_token>`
- **响应拦截器**：401 时自动用 refresh_token 换新 access_token 并重试请求
- **Token 存储**：独立于 Zustand（`src/services/token.ts`），避免循环引用

### CORS 白名单

后端 `.env` 中配置了允许的前端来源：

```
CORS_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:19000
```

`8081` 是 Expo Web 的 Metro bundler 端口。

### 调试开关

#### Mock 数据模式

在 `app/src/stores/chat.store.ts` 中：

```typescript
const USE_MOCKS = true;  // true = 使用本地 mock 数据，无需后端
```

设为 `true` 后，对话和会话都使用本地 Mock 数据，可脱离后端独立调试前端 UI。

#### 跳过登录

在 `app/src/app/(app)/_layout.tsx` 中：

```typescript
const DEBUG_SKIP_AUTH = true;  // true = 跳过登录校验
```

设为 `true` 后直接进入聊天页，无需注册登录。

---

## 五、常用命令

### 后端

```bash
# 查看容器状态
docker compose ps

# 查看 API 日志
docker compose logs -f api

# 查看 PostgreSQL 日志
docker compose logs -f postgres

# 停止所有服务
docker compose down

# 停止并清空数据（删数据库和文件）
docker compose down -v

# 修改依赖后重建
docker compose down
docker compose build api --no-cache
docker compose up -d

# 进入 API 容器调试
docker compose exec api bash

# 进入 PostgreSQL
docker compose exec postgres psql -U nexus -d nexus
```

### 前端

```bash
# Web 模式
npx expo start --web

# Android（需模拟器或 Expo Go）
npx expo start --android

# iOS（需 macOS + Xcode）
npx expo start --ios

# 清除缓存重启
npx expo start -c
```

---

## 六、故障排查

### 端口被占用

```
Bind for 0.0.0.0:8000 failed: port is already allocated
```

Docker Desktop for Windows 的网络代理层（vpnkit）容易残留端口映射，即使 `netstat` 查不到也会报错。

**解决**：换一个端口。编辑 `docker-compose.yml`，将 `"8001:8000"` 改为 `"8002:8000"` 等，同时更新前端 `api.ts` 中的端口。

### Docker 命令无响应 / 卡死

Docker Desktop for Windows 网络层不稳定，容器 I/O 频繁时容易卡死。

**解决**：任务栏右下角 Docker 图标 → 右键 → **Restart**（或 Quit 后重新打开）

### 迁移后数据库表仍不存在

```
relation "users" does not exist
```

说明迁移文件为空或未生成。因为项目初始没有预写迁移文件。

**解决**：

```bash
docker compose exec api alembic revision --autogenerate -m "init"
docker compose exec api alembic upgrade head
```

### 注册报 500（bcrypt 兼容问题）

```
ValueError: password cannot be longer than 72 bytes
```

`bcrypt >= 4.2` 与 `passlib` 不兼容。

**解决**：已在 `pyproject.toml` 中锁定 `bcrypt>=4.0.0,<4.2`。如果遇到此问题，检查版本约束并重建镜像。

### 注册报 422（密码太短）

```
422 Unprocessable Entity
```

后端要求密码 `min_length=8`，前端在注册页也会提示「密码至少需要 8 位」。

### 前端 timeout / network error（Web 端）

一般是后端根本没收到请求。检查：

1. 后端是否在运行：`docker compose ps`
2. 端口是否通：`curl http://localhost:8001/api/v1/health`
3. 前端 API 地址是否正确（检查 `app/src/services/api.ts` 中 `SERVER_HOST`）

### 前端 timeout / network error（Android 真机）

手机上的 `localhost` 指向手机自己。真机调试需将 `SERVER_HOST` 改为电脑的局域网 IP（如 `http://192.168.1.100:8001`）。

### LLM 调用失败

```
502 Bad Gateway: LLM request failed
```

检查 `.env` 中的 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL` 是否正确配置。

---

## 七、已修复的历史问题

以下是项目初始代码中已修复的问题，记录供参考：

| 问题 | 文件 | 修复 |
|---|---|---|
| 缺少 `uv.lock` 导致 Docker 构建失败 | `Dockerfile.dev` | `COPY pyproject.toml uv.lock ./` |
| 访问 ghcr.io 超时（国内网络） | `Dockerfile.dev` | 改用 `pip install uv` |
| 缺少 `email-validator` 依赖 | `pyproject.toml` | 添加 `email-validator>=2.0.0` |
| structlog `PrintLogger` 不兼容 | `src/infra/logging.py` | `PrintLoggerFactory` → `LoggerFactory` + `logging.basicConfig` |
| bcrypt 4.2+ 与 passlib 不兼容 | `pyproject.toml` | `bcrypt>=4.0.0,<4.2` |
| 无预置迁移文件 | `alembic/versions/` | 需手动 `revision --autogenerate -m "init"` |
| 密码校验不一致 | 前端 6 位 vs 后 8 位 | 统一 8 位 |
| 端口 8000 被 Docker 残留锁死 | `docker-compose.yml` | 改用端口 8001 |
| API 缺少 chat/sessions/documents 端点 | `src/api/v1/` | 新增 chat.py, sessions.py, documents.py |
| API 缺少 LLM 接入层 | `src/infra/llm/` | 新增 deepseek_provider.py（流式 + 非流式） |

---

## 八、生产环境检查清单

上线前修改 `.env`：

- `DEBUG=false`
- `LOG_LEVEL=INFO`
- `JWT_SECRET_KEY` — 用 `python -c "import secrets; print(secrets.token_urlsafe(64))"` 生成强随机串
- `POSTGRES_PASSWORD` — 强密码
- `MINIO_ROOT_PASSWORD` / `MINIO_SECRET_KEY` — 强密码
- `CORS_ORIGINS` — 仅填生产域名
- `OPENAI_API_KEY` — 配置 LLM API 密钥

## 相关文档

- [后端 README](./README.md) — API 端点详情、架构设计
- [前端 README](../app/README.md) — 前端技术栈、项目结构
