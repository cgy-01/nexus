@AGENTS.md

# 项目目录结构

```
app/
├── assets/                    # 静态资源
│   ├── expo.icon/             # iOS 图标 (SF Symbols 风格)
│   └── images/                # 图标、启动画面
│       └── tabIcons/          # 底部 Tab 图标 (home/explore @1x/2x/3x)
├── scripts/
│   └── reset-project.js       # 项目重置脚本（清空模板，重新开始）
├── src/
│   ├── app/                   # Expo Router 文件路由
│   │   ├── _layout.tsx        # 根布局：认证 hydrate + ThemeProvider
│   │   ├── index.tsx          # 入口：路由到登录页或主应用
│   │   ├── (auth)/            # 认证页面组
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx      # 登录页
│   │   │   └── register.tsx   # 注册页
│   │   └── (app)/             # 主应用页面组（需登录）
│   │       ├── _layout.tsx    # Tab 导航 + 侧边栏 + 个人信息面板
│   │       ├── chat/
│   │       │   └── index.tsx  # AI 对话页（SSE 流式）
│   │       ├── documents/
│   │       │   ├── _layout.tsx
│   │       │   ├── index.tsx  # 笔记列表
│   │       │   └── [id].tsx   # 笔记详情
│   │       └── profile/
│   │           ├── _layout.tsx
│   │           ├── index.tsx  # 个人信息
│   │           └── detail.tsx # 信息编辑
│   ├── components/            # 可复用 UI 组件
│   │   ├── icons.tsx               # 自定义 Tab 图标 (SVG)：Chat / Notes / User
│   │   ├── markdown-text.tsx       # Markdown 渲染（react-native-markdown-display）
│   │   ├── sidebar.tsx             # 对话历史侧边栏列表
│   │   ├── sidebar-drawer.tsx      # 侧边栏动画抽屉 (Reanimated)
│   │   └── profile-detail-panel.tsx  # 个人信息滑出面板
│   ├── services/              # API 层（Axios）
│   │   ├── api.ts                  # 全局客户端：拦截器、Token 自动刷新
│   │   ├── token.ts                # Token 存储（独立于 Zustand）
│   │   ├── auth.service.ts         # 注册 / 登录 / 刷新 / 登出
│   │   ├── chat.service.ts         # 会话 CRUD + SSE 消息流
│   │   ├── document.service.ts     # 笔记 CRUD + AI 生成
│   │   └── user.service.ts         # 用户信息
│   ├── stores/                # Zustand 状态管理
│   │   ├── auth.store.ts           # 认证状态（isLoggedIn, hydrate, login, logout）
│   │   ├── chat.store.ts           # 会话 + 消息 + SSE 流式（含 USE_MOCKS 开关）
│   │   ├── document.store.ts       # 笔记列表 + 详情 + AI 生成
│   │   ├── sidebar.store.ts        # 侧边栏开关
│   │   └── profile-panel.store.ts  # 个人信息面板开关
│   ├── types/                 # TypeScript 类型定义
│   │   ├── index.ts                # 统一导出
│   │   ├── api.ts                  # 通用响应类型（ApiResponse, PaginatedResponse）
│   │   ├── auth.ts                 # 认证请求/响应
│   │   ├── chat.ts                 # Session / Message
│   │   └── document.ts             # Document / Note
│   ├── hooks/
│   │   ├── use-sse.ts              # SSE 流式读取 Hook
│   │   ├── use-color-scheme.ts     # 原生：直接透传 RN 的 useColorScheme
│   │   ├── use-color-scheme.web.ts # Web：hydration-safe + 默认 light
│   │   └── use-theme.ts            # 主题 Hook → 返回 light/dark 颜色集
│   ├── mocks/
│   │   └── llm-response.ts         # 本地 Mock 数据（调试用）
│   ├── constants/
│   │   └── theme.ts                # 颜色系统 + 字体 + 间距 + 布局常量
│   └── global.css                  # CSS 自定义属性（Web 字体栈）
├── app.json                   # Expo 配置 (name: "Nexus", EAS Update, 启动屏)
├── package.json               # 依赖 & 脚本
├── tsconfig.json              # TypeScript 配置 (strict, 路径别名 @/)
└── expo-env.d.ts              # Expo 类型引用（自动生成，勿手动编辑）
```

# 关键约定

- 路径别名：`@/*` → `./src/*`，`@/assets/*` → `./assets/*`
- 平台文件分叉：`*.web.tsx` 覆盖 `*.tsx`（构建时自动选择）
- 主题颜色使用语义 key：`'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary'`
- 所有页面和组件必须兼容 Android / iOS / Web 三端
- API 服务器地址配置在 `src/services/api.ts` → `SERVER_HOST`
- 调试用 Mock 数据开关：`src/stores/chat.store.ts` → `USE_MOCKS`
- 跳过登录调试开关：`src/app/(app)/_layout.tsx` → `DEBUG_SKIP_AUTH`
- Token 管理独立于 Zustand（`src/services/token.ts`），避免循环引用
- SSE 流式消息通过 `fetch` + `ReadableStream` 手动解析，不使用 EventSource
