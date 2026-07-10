# 前端改造 TodoList

> 基于 `AI_Native_App_Technical_Design.md` 修订版技术方案，将当前 Expo 模板项目改造为 AI 聊天应用。
>
> 当前状态：Expo SDK 56 模板（单页面 mock），缺少 Zustand、Axios、多页面路由、SSE 流式消费。

---

## 执行顺序概览

```
第1步:  #1  安装依赖                           (基石)
         │
第2步:  ├─ #11 类型定义                         (可并行)
         ├─ #3  Zustand stores                  (可并行)
         └─ #2  API 服务层                      (可并行)
         │    │    │
第3步:  ├─ #7  SSE Hook                        (依赖 #2, #11)
         ├─ #5  认证页面                        (依赖 #2, #3, #11)
         ├─ #8  文档页面                        (依赖 #2, #3, #11)
         └─ #9  个人中心                        (依赖 #3)
         │    │    │    │
第4步:  ├─ #4  改造根布局                       (依赖 #3, #5)
         └─ #6  重构聊天页                       (依赖 #2, #3, #7, #11)
              │    │
第5步:     ├─ #10 清理 mock                      (依赖 #2, #3, #6)
           └─ #12 改造侧边栏                     (依赖 #3, #6)
                │
第6步:          └─ #13 最终代码清理               (依赖 #10, #12)
```

---

## 第一批：基础依赖（可立即开始）

### #1 安装缺失依赖：zustand + axios

**文件**：`package.json`

**内容**：
```bash
npm install zustand axios
```

当前项目缺少状态管理和 HTTP 客户端库，这是后续所有工作的前提。

---

### #11 添加 TypeScript 类型定义

**新建**：`app/src/types/`

```
types/
├── api.ts          # API 响应泛型：ApiResponse<T>, PaginatedResponse<T>
├── auth.ts         # 认证：LoginRequest, RegisterRequest, TokenResponse, User
├── chat.ts         # 聊天：Message, Session, ChatRequest, SSEEvent
└── document.ts     # 文档：Document, Embedding, DocumentStatus
```

---

### #3 创建 Zustand stores

**新建**：`app/src/stores/`

```
stores/
├── auth.store.ts       # 认证状态：user, token, isLoggedIn, login(), logout(), refreshToken()
├── chat.store.ts       # 聊天状态：sessions[], currentMessages[], sendMessage(), createSession()
└── document.store.ts   # 文档状态：documents[], generateDoc(), deleteDoc()
```

**关键点**：
- `auth.store.ts` 在 `login()` 成功后将 token 写入 store，同时通过 api 拦截器自动附加
- `chat.store.ts` 的 `sendMessage()` 需要支持 SSE 流式接收
- 所有 store 不直接操作 AsyncStorage（token 持久化后续再加）

---

### #2 创建 API 服务层

**新建**：`app/src/services/`

```
services/
├── api.ts              # Axios 实例：baseURL, timeout, 请求拦截器(加 token), 响应拦截器(401 刷新)
├── auth.service.ts     # register(), login(), refresh(), logout(), getMe()
├── chat.service.ts     # createSession(), getSessions(), getMessages(), sendMessage()
└── document.service.ts # getDocuments(), getDocument(), generateDoc(), deleteDoc()
```

**关键设计**：
- `api.ts` 创建 Axios 实例，`baseURL` 从环境变量读取
- 请求拦截器自动从 `useAuthStore.getState()` 取 token 附加到 Authorization header
- 响应拦截器处理 401 → 自动 refresh token → 重试原请求
- `chat.service.ts` 的 `sendMessage()` 不用 Axios（因为需要 SSE 流式），用 `fetch` + `ReadableStream`

---

## 第二批：功能模块（有依赖，彼此可并行）

### #7 实现 SSE 流式消费 Hook

**新建**：`app/src/hooks/use-sse.ts`

**依赖**：#2, #11

**功能**：
- 基于 `fetch` + `ReadableStream` reader 手动解析 SSE 协议
- 支持事件类型：`token`（逐字追加内容）、`done`（完成 + token 统计）、`error`（错误处理）
- 返回 `{ content, isStreaming, error, startStream, abort }`
- 注意 React Native Hermes 引擎对 `ReadableStream` 的支持情况，需要测试

**接口设计**：
```typescript
interface UseSSEOptions {
  onToken?: (token: string) => void;
  onDone?: (meta: { totalTokens: number; model: string }) => void;
  onError?: (error: SSEError) => void;
}

function useSSE(url: string, options?: UseSSEOptions): {
  content: string;
  isStreaming: boolean;
  error: SSEError | null;
  startStream: (body: unknown) => Promise<void>;
  abort: () => void;
}
```

---

### #5 新建认证页面

**新建**：`app/src/app/(auth)/login.tsx`、`app/src/app/(auth)/register.tsx`

**依赖**：#2, #3, #11

**login.tsx**：
- 邮箱 + 密码输入框
- 登录按钮（调用 `authStore.login()`）
- 成功后 `router.replace('/(app)/chat')`
- 底部"没有账号？去注册"链接

**register.tsx**：
- 邮箱 + 密码 + 确认密码 + 显示名称
- 注册按钮（调用 `authStore.register()`）
- 成功后跳转聊天主页

**UI 规范**：复用 `theme.ts` 的颜色和间距系统，Markdown 不需要，纯表单页面。

---

### #8 新建文档页面

**新建**：`app/src/app/(app)/documents/index.tsx`、`app/src/app/(app)/documents/[id].tsx`

**依赖**：#2, #3, #11

**index.tsx（文档列表）**：
- FlatList 展示文档卡片（标题、摘要、日期、状态标签）
- 下拉刷新
- 长按或滑动删除
- 空状态提示"还没有知识文档，开始聊天后会自动生成"

**[id].tsx（文档详情）**：
- 文档标题 + 完整内容（Markdown 渲染）
- 来源会话链接
- 删除按钮

---

### #9 新建个人中心页

**新建**：`app/src/app/(app)/profile.tsx`

**依赖**：#3

**内容**：
- 用户头像 + 显示名称 + 邮箱（从 `authStore.user` 读取）
- 退出登录按钮（调用 `authStore.logout()` → `router.replace('/(auth)/login')`）
- 可选：App 版本号、清除缓存

---

## 第三批：核心重构（依赖前面的任务）

### #4 改造根布局 _layout.tsx

**修改**：`app/src/app/_layout.tsx`

**依赖**：#3, #5

**改造内容**：

当前状态（仅 ThemeProvider + Stack）：
```tsx
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

改造后（加入登录态检测 + 路由守卫）：
```tsx
export default function RootLayout() {
  const { isLoggedIn, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, []);

  if (/* 正在检查登录态 */) return <SplashScreen />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="(app)" />
          ) : (
            <Stack.Screen name="(auth)" />
          )}
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

---

### #6 重构聊天页（最大改动）

**修改 + 新建**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/app/index.tsx` | 重写 | 改为启动中转页：检测登录态 → 跳转 /(auth)/login 或 /(app)/chat |
| `app/src/app/(app)/chat/index.tsx` | 新建 | 会话列表页：FlatList + 新建会话按钮 |
| `app/src/app/(app)/chat/[id].tsx` | 新建 | 聊天详情页：消息气泡 + 输入框 + SSE 流式 |

**依赖**：#2, #3, #7, #11

**chat/index.tsx（会话列表）**：
- 从 `chatStore.sessions` 读取列表
- 顶部"新建对话"按钮（调用 `chatStore.createSession()`）
- 点击会话 → `router.push('/(app)/chat/${id}')`
- 侧边栏入口（保留现有的 SidebarDrawer）
- 下拉刷新

**chat/[id].tsx（聊天详情）**：
- 从 `chatStore.currentMessages` 读取消息
- FlatList 渲染消息气泡（复用现有 `ChatBubble`）+ Markdown（AI 回复）
- 底部输入框（复用现有 `inputBar` 样式）
- 发送按钮调用 `chatStore.sendMessage()` → SSE 流式接收
- 流式渲染：AI 回复逐字出现
- 记忆提取触发按钮（右上角，手动触发 → `documentStore.generateDoc(sessionId)`）

---

## 收尾

### #10 清理 mock 数据

**影响文件**：
- `app/src/app/index.tsx` → 删除 `mockLLMResponse` 引用
- `app/src/app/(app)/chat/[id].tsx` → 删除 `setTimeout` mock，改用真实 SSE
- `app/src/components/sidebar.tsx` 或调用处 → 删除 `sidebar-history.json` 引用

**依赖**：#2, #3, #6

---

### #12 改造侧边栏数据源

**影响文件**：
- `app/src/app/(app)/chat/index.tsx` 或 `_layout.tsx` → 侧边栏 `sections` 从静态 JSON 改为 `chatStore.sessions`

**依赖**：#3, #6

**改造逻辑**：
```typescript
// 当前：静态 JSON
const sidebarSections = sidebarData.sections.map(...)

// 改造后：按时间分组
function groupSessionsByTime(sessions: Session[]): MenuSectionData[] {
  const now = new Date();
  // 今天 / 昨天 / 七天内 / 30天内 / 更久
  return [
    { heading: '今天', items: /* sessions from today */ },
    { heading: '昨天', items: /* sessions from yesterday */ },
    // ...
  ];
}
```

---

### #13 最终代码清理

**依赖**：#10, #12

**检查项**：
- [ ] `mocks/` 目录：保留 `llm-response.ts` 作为类型参考，删除 `sidebar-history.json`
- [ ] `index.tsx` 中不再需要的 state 和 callback（`chatStarted`, `handleNewChat`, `handlePillPress` 等迁移到新页面）
- [ ] 无未使用的 import
- [ ] 无 console.log 调试代码
- [ ] 所有 TODO 注释已处理

---

## 文件变更汇总

### 新建文件（~20 个）

```
app/src/
├── types/
│   ├── api.ts
│   ├── auth.ts
│   ├── chat.ts
│   └── document.ts
├── stores/
│   ├── auth.store.ts
│   ├── chat.store.ts
│   └── document.store.ts
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   ├── chat.service.ts
│   └── document.service.ts
├── hooks/
│   └── use-sse.ts
└── app/
    ├── (auth)/
    │   ├── login.tsx
    │   └── register.tsx
    └── (app)/
        ├── chat/
        │   ├── index.tsx
        │   └── [id].tsx
        ├── documents/
        │   ├── index.tsx
        │   └── [id].tsx
        └── profile.tsx
```

### 修改文件（~3 个）

```
app/src/app/_layout.tsx     # 加入路由守卫
app/src/app/index.tsx       # 重写为启动中转页
package.json                # 添加 zustand, axios 依赖
```

### 可能删除/归档

```
app/src/mocks/sidebar-history.json    # 替换为真实数据
app/src/mocks/llm-response.ts         # 保留类型参考，删除 import
```

---

## 可复用的现有资产

| 现有代码 | 处理方式 |
|----------|----------|
| `theme.ts` (颜色/间距/字体) | ✅ 直接复用 |
| `use-theme.ts` (主题 Hook) | ✅ 直接复用 |
| `use-color-scheme.ts` | ✅ 直接复用 |
| `markdown-text.tsx` | ✅ 直接复用 |
| `themed-text.tsx` / `themed-view.tsx` | ✅ 直接复用 |
| `sidebar.tsx` + `sidebar-drawer.tsx` | ⚠️ 保留结构，数据源改为 store |
| `icons.tsx` (MenuIcon, EditIcon, SendIcon 等) | ✅ 直接复用 |
| `collapsible.tsx` | ✅ 保留，文档详情可能用到 |
| `external-link.tsx` | ✅ 保留 |
| `index.tsx` 中的 `ChatBubble` | ⚠️ 迁移到 `components/chat/message-bubble.tsx` |
| `index.tsx` 中的 `inputBar` | ⚠️ 迁移到 `components/chat/chat-input.tsx` |
