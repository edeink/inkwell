---
id: quick-start
title: 快速开始
sidebar_position: 2
---

# 快速开始

本文档介绍了如何在 Inkwell 项目中进行高效开发，包括环境搭建、组件开发流程和调试技巧。

## 环境准备

确保你已经安装了 Node.js (v22+) 和 pnpm。

```bash
pnpm install
```

## 启动开发环境

### 1. 运行 Mindmap Demo
这是最常用的开发方式，可以实时预览 Widget 的效果。

```bash
pnpm dev
```
这将启动 Vite 服务器，打开浏览器访问 `http://localhost:5173`。

### 2. 运行文档
如果你在编写文档或查看组件示例：

```bash
pnpm doc
```

## 组件开发基础

Inkwell 的组件开发体验与 React 非常相似。

### 1. 定义 State 和 Props

继承 `StatefulWidget` 并传入 Props 和 State 的类型定义。

```tsx
import { StatefulWidget, WidgetProps } from '@/core';

interface CounterProps extends WidgetProps {
  initialValue?: number;
}

interface CounterState {
  count: number;
}

export class Counter extends StatefulWidget<CounterProps, CounterState> {
  // 初始化 State
  state: CounterState = {
    count: this.props.initialValue || 0,
  };

  // ...
}
```

### 2. 更新 State (setState)

使用 `setState` 更新状态，这将触发组件的 `build` (对于 StatelessWidget 是 `render`) 方法重新执行。

```tsx
handleIncrement = () => {
  this.setState({
    count: this.state.count + 1
  });
};
```

### 3. 使用 JSX 传递参数

在 `render` 方法中，使用 JSX 语法构建 UI 树，并通过属性传递 Props。

```tsx
render() {
  return (
    <Container color="white" padding={10}>
      <Text text={`Count: ${this.state.count}`} />
      <Button onClick={this.handleIncrement}>
        <Text text="Increment" />
      </Button>
    </Container>
  );
}
```

如需了解更多关于**自定义组件**的高级用法（如直接操作 RenderObject），请参阅 [自定义组件指南](../advanced/custom-widget)。

## 调试与测试

### 调试
Inkwell 提供了专门的开发者工具用于检查 Widget 树和性能分析。
详细说明请参阅 [开发者工具](../advanced/devtools)。

### 测试
我们使用 Vitest 进行单元测试。
详细测试方法请参阅 [测试指南](../advanced/testing)。

```bash
pnpm test
```
