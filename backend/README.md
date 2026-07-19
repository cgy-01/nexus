# Nexus AI Backend

The FastAPI backend for Nexus AI. It provides JWT authentication, streaming AI chat, AI note generation, PostgreSQL with pgvector, Redis caching, and MinIO object storage.

---

## Modules

| 模块 | 说明 |
|------|------|
| 认证 | 注册 / 登录 / Token 刷新（旋转）/ 登出，JWT 双 Token 机制 |
| 对话 | 多会话管理，SSE 流式对话，接入 DeepSeek LLM |
| 笔记 | 手动创建 / 从对话 AI 自动生成结构化 Markdown 笔记 |
| 用户 | 个人信息查询 |
| 文件 | MinIO (S3 兼容) 对象存储 |
| 健康检查 | 数据库 + Redis 连通性检测 |

## Technology Stack

| 层 | 技术 |
|---|------|
| Web 框架 | FastAPI (async) |
| ORM | SQLAlchemy 2.0 + asyncpg |
| 数据校验 | Pydantic v2 |
| 数据库 | PostgreSQL 16 + pgvector |
| 缓存 | Redis 7 |
| 对象存储 | MinIO (S3 兼容) |
| LLM | DeepSeek (OpenAI 兼容协议，支持流式与非流式) |
| 数据库迁移 | Alembic (async) |
| 日志 | structlog (结构化 JSON) |
| 包管理 | uv (PEP 621) |

---

## Requirements

- **Python** ≥ 3.12
- **uv** ≥ 0.11（[安装指南](https://docs.astral.sh/uv/getting-started/installation/)）
- **Docker** + Docker Compose（运行基础设施）
- **PostgreSQL** 16 + **Redis** 7（可直接用 Docker 提供）

---

## Quick Start

```bash
# 1. 安装依赖（含开发工具）
uv sync --dev

# 2. 准备配置文件
cp .env.example .env
# 编辑 .env → 修改 JWT_SECRET_KEY 和 OPENAI_API_KEY

# 3. 启动基础设施（PostgreSQL + Redis + MinIO）
docker compose up -d postgres redis minio

# 4. 运行数据库迁移
.venv\Scripts\alembic.exe upgrade head
# 或在 Linux/macOS:
# .venv/bin/alembic upgrade head

# 5. 启动 API 服务
.venv\Scripts\uvicorn.exe src.main:app --reload --port 8000

# 6. 验证
curl http://localhost:8000/api/v1/health
# → {"status":"ok","db":"ok","redis":"ok"}
```

打开 [http://localhost:8000/docs](http://localhost:8000/docs) 查看 Swagger UI。

---

## 目录结构

```
backend/
├── src/
│   ├── main.py                    # FastAPI 应用入口（工厂模式）
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py        # 路由聚合（/api/v1/ 前缀）
│   │       ├── auth.py            # POST /auth/register, login, refresh, logout
│   │       ├── users.py           # GET /users/me
│   │       ├── chat.py            # POST /chat（SSE 流式对话）
│   │       ├── sessions.py        # CRUD /sessions + /sessions/{id}/messages
│   │       ├── documents.py       # CRUD /documents + POST /documents/generate
│   │       └── health.py          # GET /health
│   ├── application/               # 业务逻辑层
│   │   ├── auth_service.py        # 注册/登录/Token 管理
│   │   ├── chat_service.py        # 对话编排（上下文+LLM+存储）
│   │   ├── session_service.py     # 会话 CRUD
│   │   └── document_service.py    # 笔记 CRUD + AI 自动生成
│   ├── domain/                    # 领域模型
│   │   ├── models/                # SQLAlchemy ORM 模型
│   │   │   ├── base.py            # 基类 + UUID/Timestamp Mixin
│   │   │   ├── user.py
│   │   │   ├── refresh_token.py
│   │   │   ├── session.py         # 对话会话
│   │   │   ├── message.py         # 对话消息
│   │   │   └── document.py        # AI 笔记
│   │   └── schemas/               # Pydantic 请求/响应模型
│   │       ├── common.py          # ApiResponse, PaginatedResponse, ErrorDetail
│   │       ├── auth.py
│   │       ├── user.py
│   │       ├── chat.py            # ChatRequest, SessionResponse, MessageResponse
│   │       └── document.py        # CreateNoteRequest, GenerateNoteRequest, NoteOut
│   └── infra/                     # 基础设施
│       ├── config.py              # 配置（pydantic-settings, .env 读取）
│       ├── database.py            # AsyncEngine + session factory
│       ├── redis.py               # Redis async client
│       ├── security.py            # JWT 签发/验证 + 密码哈希
│       ├── logging.py             # structlog 配置
│       ├── minio_client.py        # MinIO 客户端
│       └── llm/                   # LLM 接入层
│           ├── base.py            # LLMProvider 抽象基类
│           └── deepseek_provider.py  # DeepSeek 实现（流式 + 非流式）
├── tests/
│   ├── conftest.py                # 异步 fixtures（test DB + HTTP client）
│   ├── test_health.py
│   ├── test_auth.py               # 完整注册/登录/刷新/登出测试
│   └── test_users.py
├── alembic/
│   ├── env.py                     # Async Alembic 环境
│   ├── script.py.mako             # 迁移模板
│   └── versions/                  # 迁移脚本
├── Dockerfile                     # 生产镜像（multi-stage, Python 3.12-slim）
├── Dockerfile.dev                 # 开发镜像（hot reload, volume 挂载）
├── docker-compose.yml             # 本地开发基础设施
├── pyproject.toml                 # 项目元数据 + 依赖声明
├── uv.lock                        # 依赖版本锁（uv sync 自动生成）
├── alembic.ini
├── .env.example                   # 环境变量模板
├── .gitignore
└── README.md
```

---

## 开发命令速查

```bash
# 安装依赖
uv sync --dev              # 全部安装
uv sync                    # 仅运行时

# 启动 API（热重载）
.venv\Scripts\uvicorn.exe src.main:app --reload --port 8000

# 数据库迁移
.venv\Scripts\alembic.exe upgrade head          # 应用所有迁移
.venv\Scripts\alembic.exe revision --autogenerate -m "描述"  # 生成迁移
.venv\Scripts\alembic.exe downgrade -1          # 回退一步
.venv\Scripts\alembic.exe history               # 查看迁移历史

# 测试
.venv\Scripts\pytest.exe -v                     # 运行全部测试
.venv\Scripts\pytest.exe -v --cov=src           # 含覆盖率报告
.venv\Scripts\pytest.exe -v -k "test_auth"      # 只跑认证测试

# 代码质量
.venv\Scripts\ruff.exe check .                  # Lint
.venv\Scripts\ruff.exe format .                 # 格式化

# Docker
docker compose up -d                            # 启动全部服务
docker compose up -d postgres redis             # 仅启动数据库
docker compose logs -f api                      # 查看 API 日志
docker compose down -v                          # 停止并清除数据
```

---

## 架构设计

采用三层架构：

```
api/v1/  →  application/  →  domain/  +  infra/
(路由层)    (业务逻辑层)      (模型层)     (基础设施)
```

- **路由层** 只做参数提取和依赖注入，不包含业务逻辑
- **业务逻辑层** 编排领域模型和基础设施，实现完整用例
- **领域层** 定义 ORM 模型和 Pydantic Schema，与框架解耦
- **基础设施层** 提供数据库、缓存、LLM、安全等底层能力

---

## API 约定

所有端点前缀 `/api/v1/`，响应格式：

```json
// 成功 — 始终包裹在 data 中
{ "data": { ... } }

// 分页
{ "data": [...], "total": 100, "page": 1, "page_size": 20, "total_pages": 5 }

// 错误
{ "code": "invalid_credentials", "message": "邮箱或密码错误", "detail": null }
```

### 全部端点

#### 认证（auth）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | 注册 | - |
| POST | `/api/v1/auth/login` | 登录 | - |
| POST | `/api/v1/auth/refresh` | 刷新 token | - |
| POST | `/api/v1/auth/logout` | 登出（吊销 refresh_token） | - |

#### 用户（users）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/users/me` | 获取当前用户信息 | Bearer Token |

#### 会话（sessions）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/sessions` | 创建新会话 | Bearer Token |
| GET | `/api/v1/sessions` | 列出所有会话（分页） | Bearer Token |
| GET | `/api/v1/sessions/{id}` | 获取单个会话 | Bearer Token |
| DELETE | `/api/v1/sessions/{id}` | 删除会话 | Bearer Token |
| GET | `/api/v1/sessions/{id}/messages` | 获取会话消息历史（分页） | Bearer Token |

#### 对话（chat）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/chat` | 发送消息，SSE 流式返回 | Bearer Token |

Chat 端点使用 Server-Sent Events 协议：
- `event: token` — 每个文本片段
- `event: done` — 流结束，含 `{ total_tokens, model, session_id }`
- `event: error` — 错误信息
- 如请求中未传 `session_id`，后端自动创建新会话

#### 笔记（documents）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/documents` | 列出所有笔记（分页） | Bearer Token |
| GET | `/api/v1/documents/{id}` | 获取单篇笔记 | Bearer Token |
| POST | `/api/v1/documents` | 手动创建笔记 | Bearer Token |
| DELETE | `/api/v1/documents/{id}` | 删除笔记 | Bearer Token |
| POST | `/api/v1/documents/generate` | AI 从对话生成笔记 | Bearer Token |

笔记标签：`学习` / `工作` / `想法` / `收藏`

#### 系统

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/health` | 健康检查 | - |

### JWT 认证

- **access_token**：15 分钟过期，用于 API 调用
- **refresh_token**：7 天过期，用于续期（rotation 机制：每次刷新吊销旧 token）
- 请求头：`Authorization: Bearer <access_token>`

---

## 环境变量

完整列表见 `.env.example`。关键变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 (asyncpg) | `postgresql+asyncpg://nexus:<password>@localhost:5432/nexus` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `JWT_SECRET_KEY` | JWT 签名密钥（**生产必须修改**） | - |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | access_token 有效期 | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | refresh_token 有效期 | `7` |
| `CORS_ORIGINS` | 允许的前端域名（逗号分隔） | `http://localhost:8081,http://localhost:19006` |
| `LOG_LEVEL` | 日志级别 (DEBUG/INFO/WARNING) | `DEBUG` |
| `OPENAI_API_KEY` | LLM API 密钥 | - |
| `OPENAI_BASE_URL` | LLM API 地址 | `https://api.deepseek.com/v1` |
| `LLM_DEFAULT_MODEL` | 默认模型 | `deepseek-chat` |
| `MINIO_ENDPOINT` | MinIO 地址 | `localhost:9000` |
| `MINIO_ROOT_USER` | MinIO 管理员用户名 | 在 `.env` 中设置 |
| `MINIO_ROOT_PASSWORD` | MinIO 管理员密码 | 在 `.env` 中设置 |
| `MINIO_BUCKET` | 存储桶名称 | `nexus-files` |

---

## 部署

### 通过 GitHub Actions 自动部署

推送到 `main` 分支自动触发（`.github/workflows/deploy.yml`）：
- **后端**：在 self-hosted runner 上 Docker 构建并重启
- **前端**：通过 EAS Update 推送 OTA 热更新到 preview 频道

### Docker 部署（手动）

```bash
# 1. 准备服务器上的 .env（含真实 JWT_SECRET_KEY）
cp .env.example .env
vim .env

# 2. 构建并启动
docker compose up -d

# 3. 运行迁移
docker compose exec api alembic upgrade head

# 4. 验证
curl http://localhost:8001/api/v1/health
```

### 裸机部署

```bash
# 1. 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. git clone + 安装依赖
git clone <repo> /opt/nexus-backend
cd /opt/nexus-backend
uv sync                        # 仅运行时依赖

# 3. 配置环境
cp .env.example .env && vim .env

# 4. 迁移 + 启动
source .venv/bin/activate
alembic upgrade head
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 可重现性保证

```
开发机 uv.lock  ──► 服务器 uv sync ──► 完全相同的依赖版本
开发机 Dockerfile ──► 服务器 docker build ──► 完全相同的系统环境
```

`uv.lock` 锁死了每个包的精确版本和哈希值，服务器 `uv sync` 时安装完全一致的依赖树。

---

## 测试

```bash
# 需要测试数据库（先创建 nexus_test 库）
docker compose exec postgres psql -U nexus -c "CREATE DATABASE nexus_test;"

# 运行测试
.venv\Scripts\pytest.exe -v --cov=src
```

测试使用独立数据库 `nexus_test`，每个测试在事务中运行，测试结束自动回滚。
