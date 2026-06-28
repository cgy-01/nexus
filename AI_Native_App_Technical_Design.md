# AI Native App 技术方案（修订版）

> 目标：构建一个面向求职的工业级 AI 应用项目，具备可演示、可面试、可扩展的工程能力。
>
> 核心能力：LLM 对话 + 长期记忆 + RAG 检索增强 + 工程化部署。
>
> 本文档为对原 `AI_Industrial_Job_Project_Roadmap.md` 的评估与修订，修正了技术选型、补全了关键缺失、调整了阶段顺序。

---

## 目录

1. [项目目标](#1-项目目标)
2. [架构原则](#2-架构原则)
3. [技术栈（修订）](#3-技术栈修订)
4. [系统架构](#4-系统架构)
5. [数据模型](#5-数据模型)
6. [API 设计](#6-api-设计)
7. [核心模块设计](#7-核心模块设计)
8. [LLM 可观测性](#8-llm-可观测性)
9. [工程化清单](#9-工程化清单)
10. [前端现状与改造计划](#10-前端现状与改造计划)
11. [阶段规划（修订）](#11-阶段规划修订)
12. [简历表达](#12-简历表达)

---

## 1. 项目目标

构建一个移动端 AI 对话应用，实现：

- 用户注册 / 登录（JWT 认证）
- 多轮 LLM 对话（SSE Streaming）
- 对话自动整理为结构化知识文档
- 文档向量化写入 pgvector，形成长期记忆
- 新消息自动 RAG 检索增强生成
- Docker 容器化部署 + 可观测性

---

## 2. 架构原则

| 原则 | 说明 |
|------|------|
| 薄客户端 | React Native 仅负责渲染与交互，不做 Prompt / Embedding / RAG |
| 服务端集中计算 | 所有 AI 能力收敛在 Python 后端，模型替换对前端透明 |
| 接口先行 | 先定义 OpenAPI 契约，前后端并行开发 |
| 可替换模型 | LLM Provider 通过接口抽象，支持 OpenAI / Azure / 本地模型 |
| 渐进式部署 | 每个模块完成即容器化验证，不做最后一次性打包 |

---

## 3. 技术栈（修订）

### 前端

| 模块 | 方案推荐 | 修订 |
|------|---------|------|
| 移动端框架 | React Native | **Expo SDK 56 + RN 0.85**（项目已在使用，一致） |
| 语言 | TypeScript | TypeScript 6.0 strict mode（一致） |
| 路由 | React Navigation | **expo-router**（基于 React Navigation 引擎，项目已在使用；方案文档应修正） |
| 状态管理 | Zustand | Zustand ✅（尚未集成） |
| HTTP 客户端 | Axios | Axios 或 fetch 封装均可（推荐 Axios：拦截器对 JWT 刷新友好） |
| Markdown | — | `react-native-markdown-display`（项目已集成，可复用） |
| 动画 | — | `react-native-reanimated` 4.3（项目已集成） |

### 后端

| 模块 | 方案推荐 | 修订 |
|------|---------|------|
| Web 框架 | FastAPI | ✅ 一致 |
| ORM + 迁移 | SQLAlchemy | **SQLAlchemy + Alembic**（原方案遗漏了数据库迁移工具） |
| 数据校验 | Pydantic | Pydantic v2 ✅ |
| API 文档 | OpenAPI | 自动生成，API 版本前缀 `/api/v1/` |
| 异步任务 | Celery | ✅ 用于 Embedding 生成 + 文档处理；CRUD 不走 Celery |
| 日志 | — | **structlog**（结构化日志，Day 1 接入） |

### 数据层

| 模块 | 方案推荐 | 修订 |
|------|---------|------|
| 关系数据库 | PostgreSQL | ✅ |
| 向量检索 | pgvector | ✅（项目规模最优解，免维护独立向量库） |
| 缓存 + Broker | Redis | ✅（缓存 + Celery broker + 速率限制计数器） |
| 文件存储 | MinIO | ✅（S3 兼容，本地开发可用本地文件系统代替） |

### AI 能力层 ⚠️ 重要修订

| 模块 | 方案推荐 | 修订 |
|------|---------|------|
| LLM 调用 | OpenAI SDK | ✅，**但必须抽象为 Provider 接口**（支持 OpenAI / Azure / 本地模型替换） |
| RAG 编排 | LangChain | ❌ **去掉 LangChain**。本项目的 RAG 流程不复杂：Embed → pgvector SQL 检索 → Rerank → Prompt 拼接 → LLM。直接用 OpenAI SDK + pgvector 原生查询更轻量、可调试、无黑盒 |
| Embedding | text-embedding | ✅ 明确为 `text-embedding-3-small`（1536 维，成本/质量最佳平衡点） |
| Prompt 管理 | PromptTemplate | ⚠️ 改为 **Prompt 文件化管理**：`.yaml` 或 `.json` 模板文件，Git 版本化，支持变量插值 |

### 去掉 LangChain 的理由

1. 本项目的 RAG 核心路径是 **pgvector SQL 查询**，LangChain 的 Retriever 抽象反而增加调试难度
2. LangChain 版本迭代快、破坏性变更多，维护成本高
3. 简历更值钱的是"理解 RAG 原理并实现"而非"调了 LangChain API"
4. 替代方案：`openai` SDK + 手写 pgvector 查询 + `sentence-transformers` 做 Reranker（可选）

```python
# 核心 RAG 检索本质上就是一次 SQL：
SELECT content, 1 - (embedding <=> %s::vector) AS similarity
FROM embeddings
WHERE user_id = %s
ORDER BY embedding <=> %s::vector
LIMIT %s;
```

---

## 4. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native (Expo)                         │
│   UI 渲染 · 用户交互 · 登录状态 · SSE 流式消费 · 本地缓存        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (Axios)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Nginx (生产)                               │
│              SSL 终结 · 静态资源 · 速率限制                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI (/api/v1/)                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Auth     │  │ Chat     │  │ Document │  │ Memory   │        │
│  │ Module   │  │ Module   │  │ Module   │  │ Module   │        │
│  │          │  │          │  │          │  │          │        │
│  │ Register │  │ Streaming│  │ Summarize│  │ Embed    │        │
│  │ Login    │  │ Context  │  │ Chunk    │  │ Retrieve  │        │
│  │ JWT      │  │ Prompt   │  │ Store    │  │ Rerank   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   LLM Provider Interface                   │   │
│  │   OpenAI · Azure · Local  (可插拔，配置文件切换)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │PostgreSQL│ │  Redis  │ │  MinIO  │
        │ +pgvector│ │  Cache  │ │  Files  │
        │          │ │  Broker │ │         │
        └─────────┘ └─────────┘ └─────────┘
```

---

## 5. 数据模型

### 5.1 实体关系

```
User ────< Session ────< Message ────< DocumentSource (消息→文档追溯)
  │                                     │
  └─────────────< Document ───< Embedding
                                  │
                            pgvector Index (IVFFlat)
```

### 5.2 表定义

#### users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### refresh_tokens

```sql
-- 原方案遗漏：JWT refresh token 轮换
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

#### sessions

```sql
CREATE TABLE sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) DEFAULT 'New Chat',
    model         VARCHAR(50) DEFAULT 'gpt-4o',
    total_tokens  INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
```

#### messages

```sql
CREATE TYPE message_role AS ENUM ('system', 'user', 'assistant');

CREATE TABLE messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role          message_role NOT NULL,
    content       TEXT NOT NULL,
    token_count   INTEGER DEFAULT 0,
    metadata      JSONB DEFAULT '{}',       -- { "model": "gpt-4o", "latency_ms": 1230 }
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages(session_id, created_at);
```

#### documents

```sql
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    chunk_count   INTEGER DEFAULT 0,
    status        document_status DEFAULT 'pending',
    metadata      JSONB DEFAULT '{}',       -- { "source_message_ids": [...], "generated_by": "auto" }
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
```

#### embeddings

```sql
CREATE TABLE embeddings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_index   INTEGER NOT NULL,
    content       TEXT NOT NULL,
    embedding     vector(1536) NOT NULL,    -- text-embedding-3-small
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- pgvector IVFFlat 索引（数据量 > 1000 条后创建）
CREATE INDEX idx_embeddings_vector ON embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

#### jobs（Celery 任务记录）

```sql
CREATE TYPE job_status AS ENUM ('queued', 'running', 'completed', 'failed');

CREATE TABLE jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type      VARCHAR(50) NOT NULL,      -- 'embed_document', 'generate_summary'
    status        job_status DEFAULT 'queued',
    target_id     UUID,                       -- document_id 等
    user_id       UUID REFERENCES users(id),
    error_message TEXT,
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API 设计

所有接口前缀 `/api/v1/`。以下为完整的接口契约。

### 6.1 认证

```
POST   /api/v1/auth/register          # 注册
POST   /api/v1/auth/login             # 登录，返回 access_token + refresh_token
POST   /api/v1/auth/refresh           # 刷新 access_token
POST   /api/v1/auth/logout            # 吊销 refresh_token
```

### 6.2 用户

```
GET    /api/v1/users/me               # 当前用户信息
PATCH  /api/v1/users/me               # 更新个人信息
```

### 6.3 会话

```
POST   /api/v1/sessions               # 创建新会话
GET    /api/v1/sessions               # 会话列表（分页）
GET    /api/v1/sessions/:id           # 会话详情
PATCH  /api/v1/sessions/:id           # 更新会话标题
DELETE /api/v1/sessions/:id           # 删除会话
```

### 6.4 聊天（核心）

```
POST   /api/v1/chat                   # 发送消息 → SSE Streaming 返回
                                     # Request:  { "session_id": "...", "content": "..." }
                                     # Response: SSE stream (text/event-stream)
                                     # 后端自动判断是否触发 RAG

GET    /api/v1/sessions/:id/messages  # 消息历史（分页，游标分页推荐）
```

**SSE 事件格式**：

```
event: token
data: {"content": "你好"}

event: token
data: {"content": "，我"}

event: done
data: {"total_tokens": 156, "model": "gpt-4o"}

event: error
data: {"code": "rate_limited", "message": "请求过于频繁"}
```

### 6.5 知识文档

```
POST   /api/v1/documents/generate     # 从会话生成知识文档（异步，返回 job_id）
GET    /api/v1/documents              # 文档列表（分页）
GET    /api/v1/documents/:id          # 文档详情
DELETE /api/v1/documents/:id          # 删除文档（级联删除 embeddings）
```

### 6.6 健康检查

```
GET    /api/v1/health                 # { "status": "ok", "db": "ok", "redis": "ok" }
```

### 与原始方案的关键差异

| 原方案 | 修订后 | 理由 |
|--------|--------|------|
| `POST /chat` + `POST /rag/query` 分离 | 合并为 `POST /chat`，后端自动判断是否 RAG | 用户体验统一，RAG 是后端实现细节 |
| `POST /memory` 语义模糊 | `POST /documents/generate` | 语义明确：从会话生成文档 |
| 无认证接口 | 4 个认证 + 2 个用户接口 | 用户体系是基础 |
| 无健康检查 | `/health` | 部署和监控的基础 |

---

## 7. 核心模块设计

### 7.1 聊天流程（含 RAG）

```
User Message
     │
     ▼
┌─────────────┐
│ 1. 存储消息   │  INSERT INTO messages
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. 检索判断   │  user 有历史文档? → 触发检索
└──────┬──────┘
       │
       ├── 无文档 ──→ 直接构建 Prompt
       │
       └── 有文档
             │
             ▼
       ┌─────────────────┐
       │ 3. 向量检索       │  pgvector cosine 相似度 Top-K
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ 4. Rerank (可选) │  Cross-encoder 精排 → Top-N
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ 5. Prompt 拼接   │  系统 Prompt + 检索上下文 + 消息历史 + 当前消息
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ 6. LLM Streaming │  openai.chat.completions.create(stream=True)
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ 7. 存储回复       │  INSERT assistant message
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ 8. 返回 SSE       │  token by token → client
       └─────────────────┘
```

### 7.2 记忆提取流程（异步）

```
触发条件: 会话消息数 > 阈值 OR 用户手动触发
     │
     ▼
┌──────────────────┐
│ Celery Task 入队  │  POST /documents/generate → job_id
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 1. 拉取会话消息    │  最近 N 条消息
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. LLM 摘要       │  "请将以下对话整理为结构化的知识文档"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. 文档切块       │  按段落 + 固定大小切块（~512 tokens），保留重叠
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. 批量 Embedding │  text-embedding-3-small
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. 写入 pgvector   │  INSERT INTO embeddings
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. 更新文档状态    │  status = 'completed', chunk_count = N
└──────────────────┘
```

### 7.3 Prompt 管理策略

不使用代码字符串拼接，改为文件化管理：

```
backend/
└── prompts/
    ├── chat/
    │   ├── system.yaml          # 系统角色 Prompt
    │   └── with_rag.yaml        # 带 RAG 上下文的 Prompt 模板
    ├── memory/
    │   └── summarize.yaml       # 对话摘要 Prompt
    └── schemas/
        └── document.yaml        # 结构化输出 schema（用于摘要）
```

模板示例 (`with_rag.yaml`)：

```yaml
name: chat_with_rag
version: 1
template: |
  你是一个有帮助的 AI 助手。以下是用户的历史知识库中与当前问题相关的内容：

  {context}

  请基于以上上下文回答用户的问题。如果上下文不足以回答问题，请如实说明。

  对话历史：
  {history}

  用户: {question}
  助手:
```

所有 Prompt 文件纳入 Git 版本管理，修改 Prompt 即修改代码。

---

## 8. LLM 可观测性

这是 AI 应用区别于传统 CRUD 应用的核心需求，原方案完全遗漏。

### 必须记录的指标

| 指标 | 说明 | 存储位置 |
|------|------|---------|
| `llm_request_total` | 请求总数（按 model, status 分） | Prometheus Counter |
| `llm_request_duration_seconds` | 请求延迟（P50/P95/P99） | Prometheus Histogram |
| `llm_token_total` | Token 消耗（input/output 分离） | Prometheus Counter + `sessions.total_tokens` |
| `llm_error_total` | 错误数（rate_limit, timeout, api_error） | Prometheus Counter |
| `rag_retrieval_count` | RAG 检索命中数 | Prometheus Histogram |
| `embedding_generation_duration` | Embedding 生成延迟 | Prometheus Histogram |

### 实现方式

```python
# 通过 structlog 结构化日志 + Prometheus metrics
import structlog
from prometheus_client import Counter, Histogram

logger = structlog.get_logger()

llm_request_duration = Histogram(
    "llm_request_duration_seconds",
    "LLM request latency",
    ["model", "endpoint"],
)

@llm_request_duration.labels(model="gpt-4o", endpoint="chat").time()
async def call_llm(messages: list[dict]) -> str:
    logger.info("llm_request_start", model="gpt-4o", message_count=len(messages))
    # ...
```

---

## 9. 工程化清单

### 必须完成（原方案 + 补充）

| 项目 | 说明 | 优先级 |
|------|------|--------|
| Docker | 前后端 + 数据库全部容器化，docker-compose 一键启动 | 🔴 必须 |
| GitHub Actions CI/CD | Lint → Test → Build Image → Push | 🔴 必须 |
| 结构化日志 | structlog / winston → JSON 格式 | 🔴 必须 |
| JWT 认证 | access_token (15min) + refresh_token (7d) 轮换 | 🔴 必须 |
| Alembic 数据迁移 | 数据库 schema 版本管理 | 🔴 必须 |
| Redis 缓存 | 对话上下文缓存、速率限制计数器 | 🔴 必须 |
| 速率限制 | API 级别 rate limiting（用户/IP 维度） | 🔴 必须 |
| 单元测试 | pytest > 80% 覆盖 | 🔴 必须 |
| 集成测试 | LLM 调用链使用 mock provider | 🟡 建议 |
| OpenAPI 文档 | FastAPI 自动生成 + Swagger UI | 🔴 必须 |
| 错误监控 | Sentry 或自建错误收集 | 🟡 建议 |

### 建议增加（原方案提及）

| 项目 | 说明 |
|------|------|
| OpenTelemetry | 全链路追踪（API → LLM → DB） |
| Grafana | 仪表盘（QPS、延迟、Token 消耗、错误率） |
| Prometheus | 指标收集 + 告警规则 |

### 补充建议

| 项目 | 说明 |
|------|------|
| Prompt 版本管理 | `/prompts/` 目录 + Git 版本化 |
| Embedding 重建脚本 | 换模型后的向量迁移工具 |
| API 版本策略 | `/api/v1/` 前缀 + 兼容性承诺 |

---

## 10. 前端现状与改造计划

### 10.1 当前项目状态

当前 `app/` 是一个 Expo SDK 56 模板项目，结构良好但距离 AI 聊天应用差距大：

| 能力 | 状态 | 行动 |
|------|------|------|
| 页面路由 | ✅ expo-router 已配置 | 新增登录、聊天、文档页面 |
| 主题系统 | ✅ theme.ts + use-theme | 可直接复用 |
| Markdown 渲染 | ✅ react-native-markdown-display | 可用于 AI 回复渲染 |
| 动画 | ✅ react-native-reanimated | 可用于流式文字动画 |
| **状态管理** | ❌ 未集成 Zustand | `npm install zustand` |
| **HTTP 客户端** | ❌ 未集成 | `npm install axios` |
| **聊天 UI** | ❌ 仅有欢迎页 | 需全新开发 |
| **认证流程** | ❌ 无 | 需全新开发 |
| **SSE 消费** | ❌ 无 | 需实现 EventSource 或 polyfill |

### 10.2 前端目录结构规划

```
app/src/
├── app/                          # Expo Router 页面
│   ├── _layout.tsx               # 根布局（AuthProvider + ThemeProvider）
│   ├── index.tsx                 # 启动页（检测登录状态 → 跳转）
│   ├── (auth)/                   # 认证相关页面
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/                    # 主应用页面（需登录）
│       ├── _layout.tsx           # Tab 导航
│       ├── chat/
│       │   ├── index.tsx          # 会话列表
│       │   └── [id].tsx          # 聊天详情页
│       ├── documents/
│       │   ├── index.tsx          # 文档列表
│       │   └── [id].tsx          # 文档详情
│       └── profile.tsx            # 个人中心
├── components/
│   ├── chat/
│   │   ├── message-bubble.tsx     # 消息气泡
│   │   ├── message-list.tsx       # 消息列表（FlatList）
│   │   ├── chat-input.tsx         # 输入框
│   │   └── streaming-text.tsx     # 流式文本渲染
│   ├── auth/
│   │   └── auth-guard.tsx         # 路由守卫
│   └── ui/                        # 保留现有 UI 组件
├── stores/                        # Zustand stores
│   ├── auth.store.ts              # 认证状态
│   ├── chat.store.ts              # 聊天状态
│   └── document.store.ts          # 文档状态
├── services/                      # API 调用层
│   ├── api.ts                     # Axios 实例（baseURL, 拦截器）
│   ├── auth.service.ts
│   ├── chat.service.ts
│   └── document.service.ts
├── hooks/                         # 自定义 Hook
│   ├── use-sse.ts                 # SSE 流式消费 Hook
│   └── use-theme.ts              # 已有
├── constants/
│   └── theme.ts                  # 已有
└── types/                         # TypeScript 类型
    ├── api.ts                     # API 响应类型
    └── chat.ts                    # 消息类型
```

### 10.3 关键实现：SSE 流式消费

React Native 不原生支持 EventSource，需要在 `chat.service.ts` 中实现：

```typescript
// 使用 fetch + ReadableStream reader 手动解析 SSE
async function* streamChat(
  sessionId: string,
  content: string
): AsyncGenerator<string> {
  const response = await fetch(`${BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId, content }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // 按 SSE 协议解析 buffer...
  }
}
```

> 注意：React Native 的 Hermes 引擎对 `ReadableStream` 支持有限。备选方案：`react-native-sse` 或通过原生模块桥接。Expo SDK 56 的 Hermes 版本需要验证。

---

## 11. 阶段规划（修订）

原方案顺序为 `聊天 → 用户 → RAG记忆 → 部署 → 监控`。修订后调整如下：

### Phase 1：基础设施 + 用户体系（Week 1-2）

**目标**：跑通开发环境 + 用户能注册登录。

```
后端:
├── FastAPI 项目骨架 + 目录结构
├── Docker Compose（postgres + redis + minio + api）
├── Alembic 初始化 + users / refresh_tokens 表
├── /api/v1/auth/* + /api/v1/users/me
├── JWT 签发与验证中间件
├── structlog 结构化日志接入
└── 健康检查 + OpenAPI 文档

前端:
├── npm install zustand axios
├── src/services/api.ts（Axios + 拦截器）
├── src/stores/auth.store.ts
├── 登录 / 注册页面
└── auth-guard 路由守卫
```

### Phase 2：聊天系统（Week 3-4）

**目标**：完整的流式对话体验。

```
后端:
├── sessions / messages 表 + Alembic 迁移
├── POST /chat（SSE streaming）
├── CRUD /sessions + GET /messages
├── Token 计数记录
├── 基础 Prompt 模板
└── LLM Provider 接口 + OpenAI 实现

前端:
├── 会话列表页（FlatList + 下拉刷新）
├── 聊天详情页（消息气泡 + 输入框）
├── use-sse Hook（流式渲染）
├── chat.store.ts（消息状态管理）
└── Markdown 渲染 AI 回复
```

### Phase 3：长期记忆 + RAG（Week 5-7）

**目标**：对话 → 知识文档 → 向量化 → 检索增强。

```
后端:
├── documents / embeddings / jobs 表
├── Celery 配置（Redis broker）
├── 记忆提取 Worker：摘要 + 切块 + Embedding
├── pgvector 索引创建（IVFFlat）
├── RAG 检索集成到聊天流程
├── Reranker（可选：cross-encoder 轻量模型）
├── POST /documents/generate + CRUD /documents
└── Embedding 重建脚本

前端:
├── 文档列表页 + 文档详情页
├── 手动触发记忆提取按钮
└── document.store.ts
```

### Phase 4：部署 + 可观测性（Week 8-9）

**目标**：可演示的完整系统。

```
├── Dockerfile（后端 + Celery Worker）
├── docker-compose.prod.yml
├── Nginx 反向代理配置
├── Prometheus metrics + Grafana 仪表盘
├── Sentry 错误追踪
├── CI/CD（GitHub Actions）
├── 速率限制（Redis + 中间件）
├── 集成测试（pytest + mock LLM）
└── README：本地开发 + 部署指南
```

### Phase 5：简历打磨（Week 10）

```
├── 架构图（draw.io / Excalidraw）
├── 关键指标截图（Grafana 仪表盘）
├── 技术难点总结文档
├── Demo 视频录制
└── 面试讲述提纲
```

---

## 12. 简历表达

### 一句话总结

> 独立设计并实现工业级 AI 对话应用，基于 React Native + FastAPI 构建移动端系统，完成多轮流式对话、长期记忆、RAG 检索增强、pgvector 向量检索、Docker 容器化部署与 LLM 可观测性。

### 技术亮点（面试展开点）

1. **RAG 自研而非套壳**：使用 pgvector + 手写 SQL 检索，不依赖 LangChain 黑盒
2. **流式架构**：SSE 协议实现 token 级流式输出，前后端协同设计
3. **长期记忆系统**：对话自动摘要 → 切块 → 向量化 → 检索增强的完整链路
4. **LLM 可观测性**：Token 消耗追踪、延迟分布、错误率监控
5. **工程化部署**：Docker 编排、CI/CD、数据库迁移、速率限制
6. **模块化 LLM Provider**：可插拔架构，支持 OpenAI / Azure 无缝切换

---

## 附录 A：后端目录结构

```
backend/
├── alembic/                       # 数据库迁移
│   ├── versions/
│   └── env.py
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py            # 认证接口
│   │       ├── users.py
│   │       ├── sessions.py
│   │       ├── chat.py            # 聊天接口（SSE）
│   │       └── documents.py
│   ├── application/               # 业务逻辑层
│   │   ├── auth_service.py
│   │   ├── chat_service.py
│   │   ├── document_service.py
│   │   └── memory_service.py
│   ├── domain/                    # 领域模型
│   │   ├── models/                # SQLAlchemy 模型
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── message.py
│   │   │   └── document.py
│   │   └── schemas/               # Pydantic 请求/响应模型
│   │       ├── auth.py
│   │       ├── chat.py
│   │       └── document.py
│   ├── infra/                     # 基础设施
│   │   ├── database.py            # DB 连接池
│   │   ├── redis.py               # Redis 客户端
│   │   ├── security.py            # JWT + 密码哈希
│   │   ├── llm/
│   │   │   ├── base.py            # LLM Provider 接口
│   │   │   ├── openai_provider.py
│   │   │   └── mock_provider.py   # 测试用
│   │   ├── embedding.py           # Embedding 服务
│   │   └── vector_store.py        # pgvector 查询封装
│   ├── workers/                   # Celery 异步任务
│   │   ├── celery_app.py
│   │   └── tasks/
│   │       ├── embed_document.py
│   │       └── generate_summary.py
│   └── prompts/                   # Prompt 模板（Git 版本化）
│       ├── chat/
│       │   ├── system.yaml
│       │   └── with_rag.yaml
│       └── memory/
│           └── summarize.yaml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── pyproject.toml
└── README.md
```

## 附录 B：开发命令速查

```bash
# 启动全部服务
docker compose up -d

# 数据库迁移
docker compose exec api alembic upgrade head

# 运行测试
docker compose exec api pytest -v

# Celery Worker 日志
docker compose logs -f worker

# 前端开发
cd app && npx expo start

# 查看 Prometheus 指标
curl http://localhost:9090/metrics
```

---

> **与原始方案的核心差异总结**
>
> 1. **去 LangChain**：自研 pgvector RAG，更可控、更可面试
> 2. **补全数据模型**：7 张表，明确字段/索引/关系
> 3. **补全 API 契约**：> 20 个端点，SSE 流式协议
> 4. **新增 LLM 可观测性**：Token/延迟/错误监控
> 5. **新增 Prompt 版本管理**：文件化 + Git
> 6. **修正阶段顺序**：用户体系前置，监控融入全流程
> 7. **新增前端改造计划**：基于现有 Expo 项目的完整路径
> 8. **API 合并**：`/chat` 统一入口，RAG 是后端实现细节
> 9. **新增 Alembic / 速率限制 / Embedding 重建**：工程化完善
