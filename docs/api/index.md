---
id: api-index
title: API 概览
sidebar_position: 1
---

# API 概览 (API Overview)

## 核心类 (Core Classes)

### Widget
Inkwell 的核心构建单元。与 Flutter 不同，Inkwell 采用单树结构，Widget 同时承载配置、状态和渲染逻辑。

- **StatelessWidget**: 无状态组件。
  - `build(context)`: 返回构建的 Widget 子树。
- **StatefulWidget**: 有状态组件。
  - `createState()`: 返回关联的 State 对象。
- **RenderWidget** (内部基类): 负责具体的渲染和布局。
  - `layout(constraints)`: 计算自身大小。
  - `paint(context)`: 绘制内容。

### State
`StatefulWidget` 的逻辑和状态持有者。

- `setState(fn)`: 更新状态并触发重绘。
- `initState()`: 初始化状态。
- `dispose()`: 销毁时清理资源。

### BuildContext
构建上下文，提供对 Widget 树的访问能力（如查找祖先 Widget）。

- `findAncestorWidgetOfExactType(type)`: 查找指定类型的祖先 Widget。

### BoxConstraints
布局约束，定义了组件的最小和最大宽高。

- `minWidth`, `maxWidth`
- `minHeight`, `maxHeight`

### Size
组件的大小。

- `width`, `height`

## 常用 Widget

### 布局 (Layout)
- `Container`: 组合绘制、定位、尺寸调整的便捷组件。
- `Row` / `Column`: Flex 布局组件，支持 `mainAxisAlignment` 和 `crossAxisAlignment`。
- `Stack`: 层叠布局组件，配合 `Positioned` 使用。
- `Positioned`: 在 Stack 中定位子组件。
- `Expanded`: 在 Row/Column 中填充剩余空间。
- `Wrap`: 流式布局组件。
- `Viewport` / `ScrollView`: 滚动视图组件。

### 内容 (Content)
- `Text`: 文本渲染，支持 `fontSize`, `color`, `fontWeight` 等样式。
- `Image`: 图片渲染，支持 `src`, `fit` 等属性。

### 辅助 (Helper)
- `Padding`: 添加内边距。
- `Center`: 居中对齐子组件。
- `SizedBox`: 强制指定大小。
