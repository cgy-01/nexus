# 后端工作指引

## 技术栈

FastAPI (async) · SQLAlchemy 2.0 + asyncpg · Pydantic v2 · PostgreSQL 16 + pgvector · Redis 7 · MinIO · DeepSeek LLM · Alembic · structlog · uv

## 目录与架构

三层架构：`api/v1/`（路由）→ `application/`（业务逻辑）→ `domain/`（模型）+ `infra/`（基础设施）

```
src/
├── api/v1/           # 路由层 — 只做参数提取和依赖注入，不含业务逻辑
│   ├── auth.py       # register, login, refresh, logout
│   ├── chat.py       # POST /chat — SSE 流式对话
│   ├── sessions.py   # CRUD /sessions + 消息历史
│   ├── documents.py  # CRUD /documents + AI 生成笔记
│   ├── users.py      # GET /users/me
│   └── health.py     # GET /health
├── application/      # 业务逻辑层 — 编排领域模型和基础设施
│   ├── auth_service.py
│   ├── chat_service.py       # 对话编排：存储消息 → 检索上下文 → LLM 流式 → 存储回复
│   ├── session_service.py
│   └── document_service.py   # 笔记 CRUD + LLM 生成结构化笔记
├── domain/
│   ├── models/       # SQLAlchemy ORM：User, RefreshToken, Session, Message, Document
│   └── schemas/      # Pydantic：请求/响应模型，ApiResponse<T>, PaginatedResponse<T>
└── infra/            # 基础设施
    ├── config.py            # pydantic-settings，.env 读取，lru_cache 单例
    ├── database.py          # AsyncEngine + async session factory
    ├── security.py          # JWT 签发/验证 + passlib 密码哈希
    ├── redis.py
    ├── minio_client.py
    ├── logging.py           # structlog 结构化 JSON
    └── llm/
        ├── base.py          # LLMProvider 抽象基类
        └── deepseek_provider.py  # OpenAI 兼容协议，chat_stream() + chat_sync()
```

## 关键约定

- 所有端点前缀 `/api/v1/`，响应统一包裹在 `{"data": ...}` 中
- 分页响应：`{"data": [...], "total", "page", "page_size", "total_pages"}`
- 错误响应：`{"code": "...", "message": "...", "detail": null}`
- Chat 端点使用 SSE 协议：`event: token`（文本片段）、`event: done`（结束）、`event: error`
- JWT 双 Token：access_token 15min + refresh_token 7天（rotation 机制，每次刷新吊销旧 token）
- 依赖注入：`Depends(get_db)` 获取 session，`Depends(get_current_user)` 获取当前用户
- config 通过 `get_settings()` 惰性单例获取，其他模块不应直接读 `os.environ`
- LLM Provider 模块级单例（`_get_provider()`），进程内复用 AsyncOpenAI 客户端

## 常用命令

```bash
# Docker
docker compose up -d                                     # 启动全部
docker compose logs -f api                               # API 日志
docker compose down -v                                   # 停止并清数据

# 迁移
docker compose exec api alembic revision --autogenerate -m "xxx"
docker compose exec api alembic upgrade head

# 测试（先创建 nexus_test 库）
docker compose exec postgres psql -U nexus -c "CREATE DATABASE nexus_test;"
.venv\Scripts\pytest.exe -v --cov=src

# 代码质量
.venv\Scripts\ruff.exe check . ; .venv\Scripts\ruff.exe format .
```

## 环境变量（关键）

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | asyncpg 连接串 |
| `REDIS_URL` | Redis 连接串 |
| `JWT_SECRET_KEY` | 生产必须修改 |
| `OPENAI_API_KEY` | DeepSeek API 密钥 |
| `OPENAI_BASE_URL` | 默认 `https://api.deepseek.com/v1` |
| `LLM_DEFAULT_MODEL` | 默认 `deepseek-chat` |
| `CORS_ORIGINS` | 允许的前端域名，逗号分隔 |

完整环境变量见 `.env.example`，完整 API 端点见 [README.md](README.md)。
