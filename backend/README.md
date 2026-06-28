# Nexus AI Backend

FastAPI 驱动的 AI 对话应用后端，提供 JWT 认证、PostgreSQL/pgvector 向量检索、Redis 缓存、Celery 异步任务。

---

## 技术栈

| 层 | 技术 |
|---|------|
| Web 框架 | FastAPI (async) |
| ORM | SQLAlchemy 2.0 + asyncpg |
| 数据校验 | Pydantic v2 |
| 数据库 | PostgreSQL 16 + pgvector |
| 缓存 / Broker | Redis 7 |
| 对象存储 | MinIO (S3 兼容) |
| 异步任务 | Celery |
| 数据库迁移 | Alembic (async) |
| 日志 | structlog (结构化 JSON) |
| 包管理 | uv (PEP 621) |

---

## 环境要求

- **Python** ≥ 3.12
- **uv** ≥ 0.11（[安装指南](https://docs.astral.sh/uv/getting-started/installation/)）
- **Docker** + Docker Compose（运行基础设施）
- **PostgreSQL** 16 + **Redis** 7（可直接用 Docker 提供）

---

## 快速开始

```bash
# 1. 安装依赖（含开发工具）
uv sync --dev

# 2. 准备配置文件
cp .env.example .env
# 编辑 .env → 修改 JWT_SECRET_KEY 等敏感值

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
│   ├── main.py                    # FastAPI 应用入口
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py        # 路由聚合（/api/v1/ 前缀）
│   │       ├── auth.py            # POST /auth/register, login, refresh, logout
│   │       ├── users.py           # GET /users/me
│   │       └── health.py          # GET /health
│   ├── application/
│   │   └── auth_service.py        # 认证业务逻辑
│   ├── domain/
│   │   ├── models/                # SQLAlchemy ORM 模型
│   │   │   ├── base.py            # 基类 + UUID/Timestamp Mixin
│   │   │   ├── user.py
│   │   │   └── refresh_token.py
│   │   └── schemas/               # Pydantic 请求/响应模型
│   │       ├── common.py          # ApiResponse, PaginatedResponse, ErrorDetail
│   │       ├── auth.py
│   │       └── user.py
│   └── infra/                     # 基础设施
│       ├── config.py              # 配置（pydantic-settings, .env 读取）
│       ├── database.py            # AsyncEngine + session factory
│       ├── redis.py               # Redis async client
│       ├── security.py            # JWT 签发/验证 + 密码哈希
│       └── logging.py             # structlog 配置
├── tests/
│   ├── conftest.py                # 异步 fixtures（test DB + HTTP client）
│   ├── test_health.py
│   ├── test_auth.py               # 完整注册/登录/刷新/登出测试
│   └── test_users.py
├── alembic/
│   ├── env.py                     # Async Alembic 环境
│   ├── script.py.mako             # 迁移模板
│   └── versions/                  # 迁移脚本
├── Dockerfile                     # 生产镜像（multi-stage）
├── Dockerfile.dev                 # 开发镜像（hot reload）
├── docker-compose.yml             # 本地开发基础设施
├── pyproject.toml                 # 项目元数据 + 依赖声明
├── uv.lock                        # 依赖版本锁（uv sync 自动生成）
├── alembic.ini
├── .env.example                   # 环境变量模板
├── .env                           # 本地配置（不提交）
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

### Phase 1 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | 注册 | - |
| POST | `/api/v1/auth/login` | 登录 | - |
| POST | `/api/v1/auth/refresh` | 刷新 token | - |
| POST | `/api/v1/auth/logout` | 登出 | - |
| GET | `/api/v1/users/me` | 当前用户 | Bearer Token |
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
| `DATABASE_URL` | PostgreSQL 连接串 (asyncpg) | `postgresql+asyncpg://nexus:nexus_dev@localhost:5432/nexus` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `JWT_SECRET_KEY` | JWT 签名密钥（**生产必须修改**） | - |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | access_token 有效期 | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | refresh_token 有效期 | `7` |
| `CORS_ORIGINS` | 允许的前端域名（逗号分隔） | `http://localhost:8081,http://localhost:19006` |
| `LOG_LEVEL` | 日志级别 (DEBUG/INFO/WARNING) | `DEBUG` |

---

## 迁移到服务器

### Docker 部署（推荐）

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
