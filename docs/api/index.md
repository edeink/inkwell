---
id: api-index
title: API 概览
sidebar_position: 1
---

# API 概览 (API Overview)

## 核心类 (Core Classes)

### Widget
所有 UI 组件的基类。

- `StatelessWidget`: `build(context)` 方法返回构建的 Widget 子树。
- `StatefulWidget`: `createState()` 方法返回关联的 State 对象。
- `RenderObjectWidget`: `createRenderObject(context)` 方法创建 RenderObject。

### Element
Widget 的实例化对象。

- `ComponentElement`: 对应 Stateless/Stateful Widget。
- `RenderObjectElement`: 对应 RenderObject Widget。

### RenderObject
负责渲染和布局。

- `constraints`: 父级传递的布局约束。
- `size`: 自身的计算大小。
- `parentData`: 父级存储的关于子级的数据（如位置）。
- `performLayout()`: 执行布局计算。
- `paint(context, offset)`: 执行绘制。

### BuildContext
构建上下文，提供对 Element 树的访问能力（如查找祖先 Widget）。

## 常用 Widget

### 布局 (Layout)
- `Container`: 组合绘制、定位、尺寸调整的便捷组件。
- `Row` / `Column`: Flex 布局组件。
- `Stack`: 层叠布局组件。
- `Positioned`: 在 Stack 中定位。
- `Expanded`: 在 Row/Column 中填充剩余空间。

### 内容 (Content)
- `Text`: 文本渲染。
- `Image`: 图片渲染。

### 辅助 (Helper)
- `Padding`: 添加内边距。
- `Center`: 居中对齐。
- `SizedBox`: 强制指定大小。
