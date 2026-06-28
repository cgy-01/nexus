# 项目现状总结

> 更新于 2026-06-13

---

## 页面

| 文件 | 功能 | 状态 |
|------|------|------|
| `src/app/_layout.tsx` | 根布局：SafeAreaProvider + ThemeProvider + Stack | ✅ |
| `src/app/index.tsx` | 主页面：等待/聊天双模式 | ✅ |

## 主页面功能 (`index.tsx`)

| 功能 | 说明 |
|------|------|
| 等待模式 | Top bar + 问候语 + 4 个引导卡片 + 底栏输入 |
| 聊天模式 | 发送 prompt 后切换，显示聊天气泡 + Markdown LLM 回答 |
| 侧边栏 | 点击 ☰ 打开，时间分组历史记录，点击主页面关闭 |
| 键盘避让 | 输入栏跟随键盘上移（iOS keyboardWillShow / Android keyboardDidShow） |
| 多行输入 | 自动换行（maxHeight 4行），底部不动向上扩展 |
| Mock LLM | 发送后 800ms 模拟回复，数据来自 `src/mocks/llm-response.ts` |
| Markdown 渲染 | 加粗、列表、代码块、段落（react-native-markdown-display） |
| 图标切换 | 输入框有字 → 发送按钮，无字 → 麦克风按钮 |

### 引导卡片

点击填入输入框，4 个预设 prompt：
- 什么是对话学习
- 制定一份学习计划
- 将讨论生成笔记
- 根据上周的笔记，向我提问复习

---

## 组件

| 文件 | 说明 | 状态 |
|------|------|------|
| `src/components/icons.tsx` | SVG 图标（Menu/Edit/Model/Mic/Send/More） | ✅ 使用中 |
| `src/components/sidebar.tsx` | 侧边栏内容面板（时间分组 + 菜单项，数据来自 props） | ✅ 使用中 |
| `src/components/sidebar-drawer.tsx` | 侧边栏动画容器（translateX 滑入） | ✅ 使用中 |
| `src/components/markdown-text.tsx` | 自写 Markdown 渲染 | ⚠️ 备用（现用库） |
| `src/components/ui/collapsible.tsx` | 折叠面板 | ❌ 未使用 |
| `src/components/external-link.tsx` | 外链组件 | ❌ 未使用 |
| `src/components/themed-text.tsx` | 主题文本组件 | ❌ 未使用 |
| `src/components/themed-view.tsx` | 主题背景容器 | ❌ 未使用 |

---

## 主题 & Hooks

| 文件 | 说明 |
|------|------|
| `src/constants/theme.ts` | 颜色系统（light/dark）、字体栈、间距常量 |
| `src/hooks/use-theme.ts` | 主题 Hook，返回当前色板 |
| `src/hooks/use-color-scheme.ts` | 原生端色彩方案检测 |
| `src/hooks/use-color-scheme.web.ts` | Web 端 hydration-safe 色彩方案 |

### 主题颜色

| Key | Light | Dark |
|-----|-------|------|
| `text` | `#000000` | `#ffffff` |
| `background` | `#ffffff` | `#000000` |
| `nexusBackground` | `#f0f4fa` | `#1a1d24` |
| `nexusCardBorder` | `rgba(0,0,0,0.3)` | `rgba(255,255,255,0.2)` |

### 间距

| Key | 值 |
|-----|-----|
| `half` | 2 |
| `one` | 4 |
| `two` | 8 |
| `three` | 16 |
| `four` | 24 |
| `five` | 32 |
| `six` | 64 |

---

## Mock 数据

| 文件 | 说明 |
|------|------|
| `src/mocks/llm-response.ts` | LLM 回复 mock（TypeScript 模块，代码引用） |
| `src/mocks/llm-response.txt` | LLM 回复原始 JSON 文本 |
| `src/mocks/sidebar-history.json` | 侧边栏历史记录（时间分组 + id/title/keywords/messageCount/updatedAt） |

### 侧边栏 JSON 格式

```json
{
  "sections": [
    {
      "heading": "今天",
      "items": [
        {
          "id": "conv-001",
          "title": "对话学习的原理",
          "keywords": ["交互式学习", "认知模型", "即时反馈"],
          "messageCount": 2,
          "updatedAt": "2026-06-13T10:30:00Z"
        }
      ]
    }
  ]
}
```

侧边栏组件接收 `MenuSectionData[]`，JSON 通过 `title → label`、`keywords.join(' · ') → description` 映射后传入。

---

## 资源

| 路径 | 说明 |
|------|------|
| `assets/images/default.png` | 默认用户头像（32×32） |
| `assets/images/icon.png` | App 图标 |
| `assets/images/splash-icon.png` | 启动画面图标 |
| `assets/images/tabIcons/` | 旧 Tab 图标（未使用） |

---

## 关键依赖

| 包 | 版本 | 用途 |
|------|------|------|
| `expo` | ~56.0.9 | 框架 |
| `react-native` | 0.85.3 | 运行时 |
| `expo-router` | ~56.2.9 | 文件路由 |
| `react-native-reanimated` | 4.3.1 | 侧边栏动画 |
| `react-native-safe-area-context` | ~5.7.0 | 安全区域适配 |
| `react-native-svg` | - | SVG 图标渲染 |
| `react-native-markdown-display` | - | LLM 回答 Markdown 渲染 |
| `punycode` | - | markdown-it 的 Metro 兼容 polyfill |

---

## 数据流

```
sidebar-history.json ──→ index.tsx ──→ SidebarDrawer ──→ SidebarPanel
                           │
                           └─ map: title→label, keywords.join('·')→description

用户发送 prompt ──→ handleSend()
                      ├─ setMessages(userMsg)
                      └─ setTimeout 800ms
                           └─ setMessages(llmMsg from llm-response.ts)
                                └─ Markdown 渲染
```

## 待实现

- [ ] 后端 API 接入（替换 mock 数据）
- [ ] 语音输入（麦克风按钮）
- [ ] 模型选择器
- [ ] 用户头像自定义上传
- [ ] 侧边栏搜索功能
- [ ] 侧边栏菜单项点击 → 加载历史对话
- [ ] 聊天设置（三点菜单）
- [ ] 暗色模式完善
- [ ] 图标替换为 Figma 导出资源
