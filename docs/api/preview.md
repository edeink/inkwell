---
title: API 概览
sidebar_position: 1
---

# API 概览 

## 核心类

### Widget
Inkwell 的核心构建单元。与 Flutter 不同，Inkwell 采用单树结构，Widget 同时承载配置、状态和渲染逻辑。

- `createElement(data)`: 更新属性并（按需）重建子树（包含子节点 diff/复用）。
- `layout(constraints)`: 执行布局，写入 `renderObject.size`，并在尺寸确定后定位子节点。
- `paint(context)`: 处理透明度级联、脏区域剔除与离屏渲染（RepaintBoundary），然后绘制自身与子节点。
- `hitTest(x, y)`: 判断坐标是否命中当前节点（返回 boolean）。
- `visitHitTest(x, y)`: 递归命中测试并返回最上层可响应的节点（或 null）。

### StatelessWidget
无状态复合组件：通过 `render()` 返回 JSX/Element，运行时会将其编译为子节点数据并挂载到当前节点下（通常只有一个根子节点）。

- `render()`: 返回需要渲染的子树描述。

### StatefulWidget
有状态复合组件：在 `StatelessWidget` 的基础上增加 `state` 与状态更新机制。

### State
`StatefulWidget` 的逻辑和状态持有者。

- `setState(partial)`: 合并更新状态并触发重建/重绘。
- `didUpdateWidget(oldProps)`: 当组件配置更新时调用（用于同步 state）。
- `dispose()`: 销毁时清理资源。

### BuildContext
绘制上下文：主要提供渲染器与当前世界矩阵等信息，供 `paint/paintSelf` 阶段使用。

- `renderer`: 渲染器实例。
- `worldMatrix`: 当前节点的世界变换矩阵（可选）。
- `dirtyRect`: 当前帧脏矩形区域（可选）。
- `enableOffscreenRendering`: 是否启用离屏渲染（可选）。
- `opacity`: 当前级联透明度（可选）。

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
