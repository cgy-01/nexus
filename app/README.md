# Pick — Nexus AI 智能助手

基于 Expo 跨平台框架开发的 AI 对话与知识管理应用，支持 Android / iOS / Web 三端。

## 功能概述

- **AI 对话** — 基于 DeepSeek LLM 的实时流式对话（SSE），支持多会话管理
- **AI 笔记生成** — 从对话内容一键生成结构化 Markdown 笔记，自动提取标题和标签
- **文档管理** — 笔记列表浏览、详情查看、手动创建，按标签分类（学习 / 工作 / 想法 / 收藏）
- **用户系统** — 注册 / 登录 / Token 自动刷新，JWT 双 Token 机制

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Expo SDK 56 + React Native 0.85 |
| 路由 | Expo Router（文件路由 + 类型安全） |
| 状态管理 | Zustand |
| HTTP | Axios（拦截器自动刷新 Token） |
| 动画 | react-native-reanimated 4.3 |
| 图标 | react-native-svg 15 |
| Markdown | react-native-markdown-display |
| 语言 | TypeScript 6.0 (strict) |

## 快速开始

```bash
cd app

# 安装依赖
npm install

# 启动 Web 开发模式
npx expo start --web

# 启动 Android
npx expo start --android

# 启动 iOS（需 macOS + Xcode）
npx expo start --ios
```

> 前端开发需先启动后端服务，详见 [后端开发指南](../backend/SETUP.md)。

## 项目结构

```
app/
├── assets/
│   ├── images/                  # 图标、启动画面、底部 Tab 图标
│   └── expo.icon/               # iOS 图标配置
├── src/
│   ├── app/                     # Expo Router 页面（文件路由）
│   │   ├── _layout.tsx          # 根布局：认证 hydrate + 主题
│   │   ├── index.tsx            # 入口：未登录 → 登录页，已登录 → 主页
│   │   ├── (auth)/              # 认证页面组
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx        # 登录
│   │   │   └── register.tsx     # 注册
│   │   └── (app)/               # 主应用页面组（需登录）
│   │       ├── _layout.tsx      # Tab 导航 + 侧边栏 + 个人信息面板
│   │       ├── chat/
│   │       │   └── index.tsx    # AI 对话页（SSE 流式）
│   │       ├── documents/
│   │       │   ├── _layout.tsx
│   │       │   ├── index.tsx    # 笔记列表
│   │       │   └── [id].tsx     # 笔记详情
│   │       └── profile/
│   │           ├── _layout.tsx
│   │           ├── index.tsx    # 个人信息
│   │           └── detail.tsx   # 信息编辑
│   ├── components/              # 可复用组件
│   │   ├── icons.tsx            # 自定义 Tab 图标（SVG）
│   │   ├── markdown-text.tsx    # Markdown 渲染
│   │   ├── sidebar.tsx          # 对话历史侧边栏
│   │   ├── sidebar-drawer.tsx   # 侧边栏动画抽屉
│   │   └── profile-detail-panel.tsx  # 个人信息滑出面板
│   ├── services/                # API 层（Axios）
│   │   ├── api.ts               # 全局客户端：拦截器、Token 刷新
│   │   ├── token.ts             # Token 存储（独立于 Zustand）
│   │   ├── auth.service.ts      # 注册 / 登录 / 刷新 / 登出
│   │   ├── chat.service.ts      # 会话 + SSE 消息流
│   │   ├── document.service.ts  # 笔记 CRUD + AI 生成
│   │   └── user.service.ts      # 用户信息
│   ├── stores/                  # Zustand 状态管理
│   │   ├── auth.store.ts        # 认证状态（登录态、Token）
│   │   ├── chat.store.ts        # 会话 + 消息 + SSE 流式
│   │   ├── document.store.ts    # 笔记列表 + 详情
│   │   ├── sidebar.store.ts     # 侧边栏开关
│   │   └── profile-panel.store.ts  # 个人信息面板开关
│   ├── types/                   # TypeScript 类型定义
│   │   ├── api.ts               # 通用响应类型
│   │   ├── auth.ts              # 认证请求/响应
│   │   ├── chat.ts              # Session / Message
│   │   └── document.ts          # Document / Note
│   ├── hooks/
│   │   ├── use-sse.ts           # SSE 流式读取 Hook
│   │   └── use-theme.ts         # 明暗主题
│   ├── mocks/
│   │   └── llm-response.ts      # 本地 Mock 数据（调试用）
│   ├── constants/
│   │   └── theme.ts             # 颜色、字体、间距常量
│   └── global.css               # Web 端全局样式
├── app.json                     # Expo 配置（图标/启动屏/EAS）
├── package.json
└── tsconfig.json
```

## 关键约定

- 路径别名：`@/*` → `./src/*`，`@/assets/*` → `./assets/*`
- 平台文件分叉：`*.web.tsx` 覆盖 `*.tsx`（构建时自动选择）
- 所有页面和组件兼容 Android / iOS / Web 三端
- 调试阶段 `chat.store.ts` 中 `USE_MOCKS = true` 可切换本地 Mock 数据
- API 服务器地址配置在 `src/services/api.ts` 中 `SERVER_HOST`

## 相关文档

- [后端 README](../backend/README.md) — API 端点、技术栈、部署
- [开发环境搭建](../backend/SETUP.md) — 前后端联调、Docker 配置、故障排查
