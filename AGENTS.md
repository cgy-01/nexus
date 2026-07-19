# Nexus AI — 全栈 AI 助手

Expo 跨平台前端 + FastAPI 后端 + DeepSeek LLM，提供 AI 对话、笔记生成、会话管理。

## 子项目

| 目录 | 说明 | 详细文档 | AGENTS.md |
|------|------|---------|-----------|
| `app/` | Expo SDK 56 前端，React Native 0.85 | [README](app/README.md) | [AGENTS.md](app/AGENTS.md) ✅ |
| `backend/` | FastAPI 后端，PostgreSQL/pgvector + Redis | [README](backend/README.md) | [AGENTS.md](backend/AGENTS.md) ✅ |

> Codex 在工作时如果碰到 `app/` 或 `backend/` 下的文件，会自动加载对应目录的 `AGENTS.md`。无需手动指定。

## 环境速览

```bash
# 后端（需 Docker）
cd backend && docker compose up -d

# 前端
cd app && npm install && npx expo start --web
```

详见 [backend/SETUP.md](backend/SETUP.md)。

## 仓库级约定

- **语言**：所有文档和注释使用中文
- **部署**：推送到 `main` 分支自动触发 GitHub Actions
  - 后端 → self-hosted runner Docker 部署
  - 前端 → EAS Update OTA 热更新到 preview 频道
- **路径别名（前端）**：`@/*` → `./src/*`
- **包管理**：前端用 npm，后端用 uv
