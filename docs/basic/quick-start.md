---
id: quick-start
title: 快速开始
sidebar_position: 2
---

# 开发指南

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

## 创建新组件 (Creating a Widget)

在 Inkwell 中，创建组件主要有两种方式：组合现有组件（Composition）和 自定义渲染（Custom Rendering）。

### 方式 1: 组合现有组件 (Composition)

继承 `StatelessWidget` 或 `StatefulWidget`，并实现 `render` 方法。这是最常见的方式。

```typescript
import { StatelessWidget, WidgetProps, AnyElement } from "@/core";
import { Container, Text } from "@/core";

interface MyButtonProps extends WidgetProps {
  label: string;
}

export class MyButton extends StatelessWidget<MyButtonProps> {
  protected render(): AnyElement {
    return (
      <Container color="blue">
        <Text text={this.data.label} />
      </Container>
    );
  }
}
```

### 方式 2: 自定义渲染 (Custom Rendering)

直接继承 `Widget`，并实现 `performLayout` 和 `paint` 方法。适用于需要精细控制绘制和布局的叶子节点。

```typescript
import { Widget, WidgetProps, BoxConstraints, Size, BuildContext } from "@/core/base";

export class MyCircle extends Widget {
  performLayout(constraints: BoxConstraints): Size {
    // 1. 计算期望大小
    const desiredSize = { width: 100, height: 100 };
    // 2. 遵守父级约束
    return {
      width: Math.min(desiredSize.width, constraints.maxWidth),
      height: Math.min(desiredSize.height, constraints.maxHeight),
    };
  }

  paint(context: BuildContext): void {
    const { renderer } = context;
    // 绘制逻辑
    renderer.save();
    renderer.fillStyle('red');
    renderer.beginPath();
    renderer.arc(50, 50, 50, 0, Math.PI * 2);
    renderer.fill();
    renderer.restore();
  }
}
```

## 调试 (Debugging)

### 使用 DevTools
Demo 页面内置了 DevTools，用于检查 Widget 树和性能分析。

- **启动**: 按下 `Cmd + Shift + D` (Mac) 或 `Ctrl + Shift + D` (Windows) 打开调试面板。
- **查看树结构**: 左侧面板展示完整的 Widget 树层级。
- **查看属性**: 点击树节点，右侧面板显示该 Widget 的属性（Props）、状态（State）和布局信息（RenderObject）。
- **高亮元素**: 鼠标悬停在树节点上，Canvas 中会高亮对应的区域。

### 常见问题排查
- **组件不显示？** 
  - 检查 `performLayout` 是否返回了非零的 `Size`。
  - 检查 `paint` 方法是否被调用，以及绘制坐标是否在可视区域内。
- **点击无效？** 
  - 检查 `hitTest` 逻辑是否正确覆盖了组件区域。
  - 确认组件没有被上层透明组件遮挡 (`zIndex`)。

## 测试 (Testing)

我们使用 Vitest 进行单元测试。

```bash
pnpm test
```

编写测试时，建议参考 `src/core/__tests__` 下的示例，使用测试辅助函数来模拟 Widget 树的构建和布局流程。
