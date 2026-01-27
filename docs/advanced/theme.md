---
id: theme
title: 主题定制
sidebar_position: 10
---

# 主题定制

Inkwell 框架和工具链内置了主题系统，支持明暗色模式切换与自定义主题配置。本文将介绍如何在项目中使用和扩展主题能力。

## 核心机制

主题切换基于 `<html>` 根元素的 `data-theme` 属性（`light` | `dark`）。

在工程内存在两套“同源”的主题表示：
- **Canvas 侧（Widget）**：使用 `ThemePalette`（`src/styles/theme.ts`）作为调色板对象，并通过 `theme` 属性向下传递。
- **DOM/React 侧（如 DevTools）**：使用 `src/styles/colors.css` 中的 CSS 变量；其值与 `ThemePalette` 保持同步（仓库内有同步测试）。

```html
<html data-theme="dark">
  ...
</html>
```

## 主题变量

我们定义了一套语义化的 CSS 变量，覆盖了颜色、边框、背景等视觉属性。建议在开发自定义组件时优先使用这些变量，以确保自动适配主题切换。

### 基础颜色

| 变量名 | 描述 | 默认值 (Light) | 默认值 (Dark) |
| :--- | :--- | :--- | :--- |
| `--ink-demo-primary` | 主色调 | `#1677ff` | `#1677ff` |
| `--ink-demo-secondary` | 次要色 | `#8c8c8c` | `#bfbfbf` |
| `--ink-demo-success` | 成功色 | `#52c41a` | `#52c41a` |
| `--ink-demo-warning` | 警告色 | `#faad14` | `#faad14` |
| `--ink-demo-danger` | 危险色 | `#ff4d4f` | `#ff4d4f` |

### 背景色

| 变量名 | 描述 | 默认值 (Light) | 默认值 (Dark) |
| :--- | :--- | :--- | :--- |
| `--ink-demo-bg-base` | 基础背景 | `#ffffff` | `#1b1b1d` |
| `--ink-demo-bg-surface` | 表面背景 | `#f5f5f5` | `#242526` |
| `--ink-demo-bg-container` | 容器背景 | `#ffffff` | `#242526` |
| `--ink-demo-header-bg` | 头部/侧边栏背景 | `#f8f9fa` | `#2c2c2e` |

### 文本与边框

| 变量名 | 描述 | 默认值 (Light) | 默认值 (Dark) |
| :--- | :--- | :--- | :--- |
| `--ink-demo-text-primary` | 主要文本 | `#1f1f1f` | `#e6f4ff` |
| `--ink-demo-text-secondary` | 次要文本 | `#8c8c8c` | `#bfbfbf` |
| `--ink-demo-text-placeholder` | 占位文本 | `#bfbfbf` | `#5c5c5c` |
| `--ink-demo-border` | 边框颜色 | `#d9d9d9` | `#434343` |
| `--ink-demo-border-secondary` | 次级边框 | `#f0f0f0` | `#303030` |

## 使用指南

### 1. 在 CSS/Less 中使用

直接使用 `var()` 函数引用变量：

```less
.container {
  /* 自动适配当前主题背景 */
  background: var(--ink-demo-bg-base);
  
  /* 自动适配边框颜色 */
  border: 1px solid var(--ink-demo-border);
  
  .title {
    color: var(--ink-demo-text-primary);
  }
}
```

### 2. 在 React/TypeScript 中使用
#### 2.1 Canvas 组件（Widget）中使用

Canvas 组件推荐使用 `ThemePalette` 对象，而不是在绘制路径中频繁读取 CSS 变量。

```typescript
import { Themes, getCurrentThemeMode } from '@/styles/theme';

const mode = getCurrentThemeMode();
const theme = Themes[mode];
// 将 theme 通过 props 传入你的组件树（示例略）
```

#### 2.2 读取 CSS 变量（DOM/React 或 Benchmark 场景）

如果你需要在 DOM/React 逻辑中读取 CSS 变量值，可以使用工具函数：

```typescript
import { getThemeColor } from '@/benchmark/utils/theme';

const primary = getThemeColor('--ink-demo-primary');
```

### 3. 配置 Ant Design 主题（可选）

如果你的 React 侧 UI 使用 Ant Design（如 DevTools 面板），可通过 `ConfigProvider` 同步算法与 token：

```typescript
import { ConfigProvider, theme } from 'antd';

// 暗色模式
<ConfigProvider
  theme={{
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#177ddc',
    },
  }}
>
  <App />
</ConfigProvider>
```

## 最佳实践

1.  **避免硬编码颜色**：尽量不要在代码中写死 hex 颜色值（如 `#fff`, `#000`），除非该颜色在任何主题下都保持不变。
2.  **使用语义化变量**：优先使用 `--ink-demo-bg-surface` 而不是直接定义灰色，这样在暗色模式下会自动变为深灰。
3.  **全局样式管理**：对于全局性的样式修改（如 DevTools 面板），请统一在 `src/devtools/index.module.less` 中管理，避免样式污染。
