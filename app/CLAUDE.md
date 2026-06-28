@AGENTS.md

# 项目目录结构

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
├── docs/
│   └── development-guide.md         # 完整开发指南（架构分析、依赖、组件详解）
├── app.json                   # Expo 配置 (图标/启动屏/插件)
├── package.json               # 依赖 & 脚本
├── tsconfig.json              # TypeScript 配置 (strict, 路径别名 @/)
└── expo-env.d.ts              # Expo 类型引用（自动生成，勿手动编辑）
```

# 关键约定

- 路径别名：`@/*` → `./src/*`，`@/assets/*` → `./assets/*`
- 平台文件分叉：`*.web.tsx` 覆盖 `*.tsx`（构建时自动选择）
- 主题颜色使用语义 key：`'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary'`
- 所有页面和组件必须兼容 Android / iOS / Web 三端
