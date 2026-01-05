---
id: core-concepts
title: 核心概念
sidebar_position: 3
---

# 核心概念

Inkwell 是一个基于 Canvas 的高性能 UI 渲染引擎。以下是其最核心的 4 个概念：

### 1. Widget (组件)
**Widget** 是 Inkwell 的基本构建单元。与 Flutter 不同，Inkwell 的 Widget 是**单树结构**——它同时承载了**配置（Configuration）**、**状态（State）**和**渲染逻辑（RenderObject）**。
- **StatelessWidget**: 无状态组件，用于纯展示或组合其他组件。
- **StatefulWidget**: 有状态组件，持有 `State`，状态变化触发重绘。

### 2. Runtime (运行时)
**Runtime** (`src/runtime`) 是引擎的指挥中心。它维护着全局的 Widget 树和渲染循环（Tick）。
- **调度**: 通过 `requestAnimationFrame` 批量处理 `dirty` 节点的布局（Layout）和绘制（Paint）。
- **协调**: 管理 `PipelineOwner` 和 `Renderer` 之间的协作。

### 3. Constraints (布局约束)
Inkwell 严格遵循 **"Constraints go down. Sizes go up. Parent sets position."** 的布局协议。
- **BoxConstraints**: 父节点向子节点传递最小/最大宽高约束。
- **Size**: 子节点根据约束计算自身大小并返回给父节点。
- **Offset**: 父节点决定子节点在自身坐标系中的位置。

### 4. JSX DSL
Inkwell 使用标准的 **React JSX** 语法作为描述语言。
- **编译**: 编译器 (`src/utils/compiler`) 将 JSX 转换为中间格式 (`ComponentData`)。
- **开发体验**: 开发者可以使用熟悉的 React 模式（Hooks、组件组合）开发 Canvas 应用，无需学习新语言。
