---
id: theme
title: 主题定制
sidebar_position: 10
---

# 主题定制

Inkwell 框架和工具链内置了完整的主题系统，支持明暗色模式切换和自定义主题配置。本通过介绍如何在项目中使用和扩展主题系统。

## 核心机制

主题系统基于 CSS Variables (CSS 自定义属性) 实现。通过在 `<html>` 根元素上设置 `data-theme` 属性 (`light` | `dark`) 来切换主题。

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
| `--ink-demo-primary` | 主色调 | `#1677ff` | `#177ddc` |
| `--ink-demo-success` | 成功色 | `#52c41a` | `#49aa19` |
| `--ink-demo-warning` | 警告色 | `#faad14` | `#d89614` |
| `--ink-demo-error` | 错误色 | `#ff4d4f` | `#a61d24` |
| `--ink-demo-danger` | 危险色 | `#ff4d4f` | `#a61d24` |

### 背景色

| 变量名 | 描述 | 默认值 (Light) | 默认值 (Dark) |
| :--- | :--- | :--- | :--- |
| `--ink-demo-bg-base` | 基础背景 | `#ffffff` | `#141414` |
| `--ink-demo-bg-surface` | 表面背景 | `#fafafa` | `#1f1f1f` |
| `--ink-demo-header-bg` | 头部/侧边栏背景 | `#f0f2f5` | `#1f1f1f` |

### 文本与边框

| 变量名 | 描述 | 默认值 (Light) | 默认值 (Dark) |
| :--- | :--- | :--- | :--- |
| `--ink-demo-text-primary` | 主要文本 | `#000000e0` | `#ffffffd9` |
| `--ink-demo-text-secondary` | 次要文本 | `#00000073` | `#ffffff73` |
| `--ink-demo-border` | 边框颜色 | `#d9d9d9` | `#424242` |

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

如果需要在 JS 逻辑中获取主题颜色（例如 Canvas 绘图），可以使用我们提供的工具函数：

```typescript
import { getThemeColor } from '@/benchmark/utils/theme';

function MyCanvasComponent() {
  const draw = (ctx: CanvasRenderingContext2D) => {
    // 获取当前主题下的主色调
    ctx.fillStyle = getThemeColor('--ink-demo-primary');
    ctx.fillRect(0, 0, 100, 100);
  };
  
  // ...
}
```

### 3. 配置 Ant Design 主题

项目集成了 Ant Design 的 ConfigProvider。在切换主题时，需要同步更新 Ant Design 的算法：

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
