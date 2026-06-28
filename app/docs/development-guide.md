# Expo 默认模板开发指南

> 基于 `create-expo-app` 生成的 Expo SDK 56 默认项目模板分析。  
> 分析日期：2026-06-10

---

## 目录结构

```
app/
├── assets/                    # 静态资源
│   ├── expo.icon/             # iOS 图标 (SF Symbols 风格)
│   └── images/                # 图标、启动画面、教程图片
│       └── tabIcons/          # 底部 Tab 图标 (home/explore @1x/2x/3x)
├── scripts/
│   └── reset-project.js       # 项目重置脚本（清空模板，重新开始）
├── src/
│   ├── app/                   # Expo Router 文件路由 (核心页面)
│   │   ├── _layout.tsx        # 根布局：ThemeProvider + 启动动画 + Tab 导航
│   │   ├── index.tsx          # 首页：欢迎屏 + 提示行
│   │   └── explore.tsx        # 探索页：文档折叠面板
│   ├── components/            # 可复用 UI 组件
│   │   ├── ui/
│   │   │   └── collapsible.tsx      # 折叠面板 (Reanimated 动画)
│   │   ├── animated-icon.tsx        # 原生端：启动动画 + Expo Logo (Keyframe)
│   │   ├── animated-icon.web.tsx    # Web 端：Logo 动画 (CSS 渐变背景)
│   │   ├── animated-icon.module.css # Web 动画专用 CSS
│   │   ├── app-tabs.tsx             # 原生端：NativeTabs (原生底部导航)
│   │   ├── app-tabs.web.tsx         # Web 端：自定义 TabList + 品牌栏
│   │   ├── external-link.tsx        # 外链组件（原生 in-app 浏览器）
│   │   ├── hint-row.tsx             # 提示行组件
│   │   ├── themed-text.tsx          # 支持 8 种排版样式的主题文本
│   │   ├── themed-view.tsx          # 主题背景容器
│   │   └── web-badge.tsx            # Web 专属 Expo Badge
│   ├── constants/
│   │   └── theme.ts                 # 颜色系统 + 字体 + 间距 + 布局常量
│   ├── hooks/
│   │   ├── use-color-scheme.ts      # 原生：直接透传 RN 的 useColorScheme
│   │   ├── use-color-scheme.web.ts  # Web：hydration-safe + 默认 light
│   │   └── use-theme.ts            # 主题 Hook → 返回 light/dark 颜色集
│   └── global.css                   # CSS 自定义属性（Web 字体栈）
├── app.json                   # Expo 配置 (图标/启动屏/插件)
├── package.json               # 依赖 & 脚本
├── tsconfig.json              # TypeScript 配置 (strict, 路径别名 @/)
├── expo-env.d.ts              # Expo 类型引用
└── README.md                  # 项目说明
```

---

## 架构特征

| 维度 | 描述 |
|------|------|
| **路由** | Expo Router (文件路由)，`typedRoutes` + React Compiler 开启 |
| **导航** | 双 Tab 结构：`index` (Home) / `explore` (Explore) |
| **平台策略** | `.native.tsx` / `.web.tsx` 文件级分叉，关键组件双端各一套实现 |
| **主题** | 自动跟随系统 light/dark 模式，5 种语义颜色 key |
| **样式** | StyleSheet + 少量 CSS Module（仅 Web Logo 背景），无第三方 CSS 框架 |
| **动画** | react-native-reanimated (Keyframe API + 弹性缓动) + react-native-worklets |

---

## 关键依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `expo` | ~56.0.9 | Expo 核心 |
| `expo-router` | ~56.2.9 | 文件路由 + 导航 |
| `react-native` | 0.85.3 | React Native 核心 |
| `react` | 19.2.3 | React 19 |
| `react-native-reanimated` | 4.3.1 | 高性能动画 |
| `expo-image` | ~56.0.10 | 优化图片加载 |
| `expo-symbols` | ~56.0.6 | SF Symbols / 系统图标 |
| `@expo/ui` | ~56.0.16 | Expo UI 组件库 |
| `react-native-gesture-handler` | ~2.31.1 | 手势处理 |
| `react-native-safe-area-context` | ~5.7.0 | 安全区域适配 |
| `react-native-screens` | 4.25.2 | 原生屏幕容器 |
| `react-native-web` | ~0.21.0 | Web 平台支持 |
| `react-dom` | 19.2.3 | React DOM (Web) |
| `expo-web-browser` | ~56.0.5 | In-app 浏览器 |
| `expo-splash-screen` | ~56.0.10 | 启动画面 |
| `expo-font` | ~56.0.5 | 字体加载 |
| `expo-constants` | ~56.0.17 | 应用常量 |
| `expo-device` | ~56.0.4 | 设备信息 |
| `expo-linking` | ~56.0.13 | 深度链接 |
| `expo-status-bar` | ~56.0.4 | 状态栏控制 |
| `expo-system-ui` | ~56.0.5 | 系统 UI 控制 |
| `expo-glass-effect` | ~56.0.4 | 玻璃效果 |
| `react-native-worklets` | 0.8.3 | Worklet 线程调度 |

### 开发依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `typescript` | ~6.0.3 | TypeScript 编译器 |
| `@types/react` | ~19.2.2 | React 类型定义 |

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm start` / `npx expo start` | 启动开发服务器 |
| `npm run android` | 在 Android 模拟器/设备上启动 |
| `npm run ios` | 在 iOS 模拟器上启动 |
| `npm run web` | 在浏览器中启动 |
| `npm run lint` | 运行 ESLint |
| `npm run reset-project` | 重置项目，清除模板代码 |

---

## 核心模块详解

### 1. 路由系统 (`src/app/`)

**`_layout.tsx`** — 根布局
- 使用 `expo-router` 的 `ThemeProvider` 包裹整个应用
- 渲染 `AnimatedSplashOverlay`（启动动画遮罩）+ `AppTabs`（Tab 导航）
- 根据系统 `useColorScheme()` 自动切换 light/dark 主题

**`index.tsx`** — 首页
- 展示 Expo Logo 动画（`AnimatedIcon`）
- 三行提示：编辑文件路径、开发工具打开方式、项目重置命令
- Web 平台额外展示 `WebBadge`（Expo 版本号 + logo）
- 使用 `SafeAreaView` + `MaxContentWidth` 实现响应式居中布局

**`explore.tsx`** — 探索页
- `ScrollView` 包裹的可滚动页面
- 5 个 `Collapsible` 折叠面板，介绍：
  - 文件路由系统
  - Android/iOS/Web 三端支持
  - 图片资源使用
  - 亮色/暗色模式
  - 动画示例
- 顶部包含 Expo 文档外链按钮
- 平台自适应 padding（Android 用 `safeAreaInsets`，Web 用固定间距）

### 2. 组件库 (`src/components/`)

#### 主题组件
| 组件 | 说明 |
|------|------|
| `ThemedText` | 支持 8 种排版类型：`default`、`title`、`subtitle`、`small`、`smallBold`、`link`、`linkPrimary`、`code`。通过 `themeColor` prop 指定语义颜色 |
| `ThemedView` | 通过 `type` prop 映射到语义背景色（`background` / `backgroundElement` / `backgroundSelected`） |

#### 导航组件
| 组件 | 平台 | 说明 |
|------|------|------|
| `app-tabs.tsx` | 原生 | 使用 `NativeTabs`，原生底部 Tab Bar，带图标模板渲染 |
| `app-tabs.web.tsx` | Web | 使用 `TabList` + `TabTrigger`，顶部浮动 pill 导航栏，左侧品牌名 "Expo Starter" + 右侧 Docs 链接 |

#### 功能组件
| 组件 | 说明 |
|------|------|
| `AnimatedSplashOverlay` | 启动遮罩动画：蓝色全屏 → 弹性缩放消退（原生端）；Web 端返回 `null` |
| `AnimatedIcon` | Expo Logo 入场动画：背景弹性缩放 + Logo 淡入 + 光晕 7200° 旋转 |
| `Collapsible` | 折叠面板，使用 `SymbolView` 的箭头图标旋转 + `FadeIn` 内容动画 |
| `ExternalLink` | 外链组件：原生端用 `openBrowserAsync`（in-app 浏览器）；Web 端正常 `target="_blank"` |
| `HintRow` | 标签-值行，用于首页操作提示 |
| `WebBadge` | Web 端专属，显示 Expo SDK 版本和 logo |

### 3. 主题系统 (`src/constants/theme.ts`)

#### 颜色定义
```typescript
Colors = {
  light: { text, background, backgroundElement, backgroundSelected, textSecondary },
  dark:  { text, background, backgroundElement, backgroundSelected, textSecondary }
}
```
- 5 个语义颜色 key，覆盖亮色/暗色两套
- 通过 `ThemeColor` 类型约束可用 key

#### 字体系统
- **iOS**: 使用系统字体族（`system-ui`、`ui-serif`、`ui-rounded`、`ui-monospace`）
- **Android**: 使用标准泛型（`normal`、`serif`、`monospace`）
- **Web**: 使用 CSS 自定义属性（由 `global.css` 定义字体栈）

#### 间距系统
```typescript
Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 }
```
- 6 级间距阶梯，基于 4px 基准

#### 布局常量
- `BottomTabInset`: iOS = 50, Android = 80, 其他 = 0
- `MaxContentWidth`: 800（内容最大宽度）

### 4. Hooks (`src/hooks/`)

| Hook | 说明 |
|------|------|
| `useColorScheme` (原生) | 直接透传 RN 的 `useColorScheme` |
| `useColorScheme` (Web) | **hydration-safe** 实现：首帧强制返回 `'light'`（避免 SSR 水合不匹配），`useEffect` 后再取真实值 |
| `useTheme` | 组合 `useColorScheme` + `Colors`，返回当前主题的颜色集 |

### 5. 平台差异化策略

项目使用 Expo 的 **文件级平台分叉** 机制：

```
animated-icon.tsx        → 原生端（Android/iOS）
animated-icon.web.tsx    → Web 端

app-tabs.tsx             → 原生端
app-tabs.web.tsx         → Web 端

use-color-scheme.ts      → 原生端
use-color-scheme.web.ts  → Web 端
```

- 原生 Tab 使用系统原生导航栏（`NativeTabs`）
- Web Tab 使用自定义 DOM 实现（顶部浮动 pill）
- 原生启动动画有完整 splash 遮罩，Web 端跳过
- Web 端通过 CSS Module 实现 Logo 渐变背景（`experimental_backgroundImage` 仅原生可用）

### 6. 启动动画流程

1. **阶段一**：`AnimatedSplashOverlay` — 蓝色全屏遮罩（`#208AEF`），从超大缩放弹性缩至正常 → 淡出消失。动画时长 600ms
2. **阶段二**：`AnimatedIcon` — 与阶段一同步进行
   - 光晕图片 7200° 持续旋转（4 分钟循环）
   - 蓝色圆角背景弹性缩放入场
   - Expo Logo 弹性放大 + 淡入
3. **回调**：splash 动画结束后通过 `scheduleOnRN` 将 `visible` 设为 `false`，卸载遮罩

---

## 设计亮点

1. **启动动画体系** — 多层次协调动画（遮罩消退 + Logo 入场 + 光晕旋转），使用 Reanimated Keyframe API + worklet 回调，性能优良

2. **平台差异化 Tab** — 原生端充分利用系统原生组件，Web 端自定义实现保持一致交互体验

3. **Web SSR Hydration 保护** — `useColorScheme.web.ts` 确保首帧渲染稳定，避免水合不匹配警告

4. **Type-safe 主题组件** — 通过 TypeScript 联合类型约束语义颜色 key，杜绝拼写错误

5. **`reset-project` 脚本** — 一键清理模板代码，快速开始新项目

---

## 注意事项

| 事项 | 说明 |
|------|------|
| **无状态管理库** | 纯 React 本地状态，适合轻量项目。复杂应用需自行引入 Zustand / Jotai / Redux |
| **无测试框架** | README 提及可选的 Jest 配置，但未预配置。参考 [Unit Testing with Jest](https://docs.expo.dev/develop/unit-testing/) |
| **无 ESLint** | 需运行 `npx expo lint` 手动初始化。参考 [Using ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/) |
| **`expo-env.d.ts`** | 注释说明应加入 `.gitignore`，文件内容为 `/// <reference types="expo/types" />`，由 Expo 自动生成 |
| **CSS Module 使用克制** | 仅在 `animated-icon.web.tsx` 中使用 `.module.css`，其余样式均用 `StyleSheet.create()` |
| **`@/` 路径别名** | `tsconfig.json` 中 `@/*` 映射到 `./src/*`，`@/assets/*` 映射到 `./assets/*` |

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 重置项目（清除模板代码）
npm run reset-project
```

## 相关资源

- [Expo 文档 (v56)](https://docs.expo.dev/versions/v56.0.0/)
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- [React Native 文档](https://reactnative.dev/)
- [React Native Reanimated 文档](https://docs.swmansion.com/react-native-reanimated/)
