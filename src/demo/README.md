# InkWell Demos

本项目包含 InkWell 框架的多个演示应用，展示了框架的核心功能和最佳实践。

## 目录结构规范

所有 Demo 项目均遵循统一的目录结构标准，以确保代码的可维护性和一致性。

### 1. 根目录结构

每个 Demo 的根目录下必须包含以下核心文件：

- `index.tsx`: **React 组件入口**。负责导出 Demo 的 React 封装组件和元数据。
- `app.tsx`: **InkWell 运行入口**。包含 InkWell Widget 定义和 `runApp` 函数。
- `index.module.less`: 样式文件（可选）。
- `type.ts`: 类型定义文件，统一管理该 Demo 的类型（可选）。

### 2. 职责分离

Demo 采用双入口模式，明确分离 React 逻辑和 InkWell 逻辑：

| 文件 | 职责 | 导出内容 |
| --- | --- | --- |
| `index.tsx` | 提供 React 容器、初始化 Canvas、注入 UI 覆盖层（如 Toolbar） | `default` (React Component), `meta` (配置信息) |
| `app.tsx` | 定义 InkWell Widget 树、执行渲染逻辑 | `runApp` (渲染函数), Widget 类 |

### 3. 代码组织

代码内容严格按照以下分类存放：

- **/components**: 存放 React 组件（UI 覆盖层、工具栏等）。
- **/widgets**: 存放 InkWell 核心 Widget 组件。
- **/helpers**: 存放工具函数和辅助逻辑。
- **/constants**: 存放常量定义。
- **/hooks**: 存放自定义 React Hooks。

## 编写规范

### 1. React 入口 (index.tsx)

每个 Demo 的 `index.tsx` 必须导出一个 React 组件（默认导出）和元数据配置。

```typescript
import React from 'react';
import { InkwellCanvas } from '../common/inkwell-canvas';
import { runApp } from './app';

// 1. 导出元数据
export const meta = {
  key: 'my-demo',
  label: '我的演示',
  description: '这是一个演示描述',
};

// 2. 导出 React 组件
export default function MyDemo() {
  return (
    <InkwellCanvas 
      style={{ width: '100%', height: '100%' }}
      onRuntimeReady={runApp} 
    />
  );
}
```

### 2. InkWell 入口 (app.tsx)

`app.tsx` 负责定义 InkWell 应用逻辑，必须实现 `runApp`。

```typescript
/** @jsxImportSource @/utils/compiler */
import { StatefulWidget, Container, Center } from '@/core';
import type Runtime from '@/runtime';

export class MyDemoApp extends StatefulWidget {
  // ... Widget 实现
}

export function runApp(runtime: Runtime) {
  runtime.render(<MyDemoApp />);
}
```

## 颜色与主题规范

为确保一致的视觉体验和对暗色模式的支持，所有 Demo 必须遵循以下颜色规范。

### 1. 语义化颜色系统

不要使用硬编码的 Hex 颜色值（如 `#1677ff`），应使用 `src/demo/styles/theme.ts` 中定义的语义化颜色。

| 语义名称 | 说明 | 对应 CSS 变量 |
| --- | --- | --- |
| `primary` | 主色 | `--ink-demo-primary` |
| `background.base` | 基础背景 | `--ink-demo-bg-base` |
| `text.primary` | 主要文本 | `--ink-demo-text-primary` |
| `border.base` | 边框 | `--ink-demo-border` |

### 2. Canvas 组件主题集成

对于 InkWell Canvas 组件，通过 `Themes` 对象获取当前主题色板，并通过 `theme` 属性传递给子组件。

```typescript
import { Themes } from '@/styles/theme';

// 在 Widget 中
const isDarkMode = ...; // 获取当前模式
const theme = Themes[isDarkMode ? 'dark' : 'light'];

return (
  <Container color={theme.background.base}>
    <Text color={theme.text.primary} text="Hello" />
  </Container>
);
```

### 3. React 组件主题集成

对于 React 组件（如 Toolbar），使用 `useTheme` Hook 或 CSS 变量。

```typescript
import { useTheme } from '@/styles/theme';

export function Toolbar() {
  const theme = useTheme();
  return <div style={{ color: theme.text.primary }}>...</div>;
}
```

或者直接使用 `src/styles/colors.css` 中定义的 CSS 变量：

```css
.toolbar {
  color: var(--ink-demo-text-primary);
  background: var(--ink-demo-bg-surface);
}
```

## 开发准则

- **默认导出**: `index.tsx` 必须使用 `export default` 导出 React 组件，以便 `src/demo/index.tsx` 统一加载。
- **元数据**: 必须导出 `meta` 对象，包含 `key`, `label`, `description`。
- **命名规范**: 文件夹使用 kebab-case，组件使用 PascalCase。
- **语言要求**: 所有注释、文档、字符串常量必须使用 **中文**。

## 维护规范

### 文档同步

在添加或修改 `docs/demo` 下的文档时，请务必遵守以下同步要求：

1.  **文档更新**: 检查并更新 `docs/demo` 目录下的相关文档，确保内容准确反映代码变更。
2.  **导航配置**: 所有在 `docs/demo` 中添加或修改的内容，必须在 `docs/sidebars.ts` 文件中同步更新导航配置，确保新文档在侧边栏中可见。
3.  **引用路径**: 确保文档中的代码引用路径正确指向 `app.tsx` 或 `index.tsx`。
