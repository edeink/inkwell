---
id: update-mechanism
title: 更新机制
sidebar_position: 2
---

# 更新机制

本文档详细解析 Inkwell 框架的组件更新机制，并结合近期的核心更新说明如何优化渲染性能。

## 1. 更新触发机制

组件更新主要由 `Props` 变化或 `State` 变化触发。

### 1.1 State 变化

当 `StatefulWidget` 调用 `setState` 时，会触发以下流程：

1.  **合并状态**: 新状态合并入当前状态。
2.  **标记脏节点**: 调用 `markDirty()`，将当前组件加入全局 `Runtime` 的脏节点列表 (`dirtyWidgets`)。
3.  **调度更新**: `Runtime` 请求下一帧动画帧 (`requestAnimationFrame`)。
4.  **批量刷新**: 在下一帧开始时，`Runtime` 执行 `flushUpdates()`，遍历脏节点列表进行重建。

### 1.2 Props 变化

当父组件重建（Rebuild）时，会重新构建子组件树：

1.  **父组件 Build**: 父组件执行 `build()` 方法，生成新的 Widget 配置数据。
2.  **子组件更新**: 框架对比新旧 Widget 配置。
3.  **Widget 更新**: 调用子组件的 `update()` 方法，传入新的 Props。
4.  **重建**: 子组件被标记为需要重建，并在当前遍历中立即执行 `rebuild`（递归过程）。

## 2. 核心更新 API 详解

为了支持更细粒度的性能优化，框架在 `v0.8.0` 引入了以下核心 API。

### 2.1 markDirty()

标记当前组件为"脏"状态，请求重新构建。

- **API**: `markDirty(): void`
- **触发**: 通常由 `setState` 内部自动调用；仅在直接继承 `Widget` 等低层组件中手动调用。
- **机制**:
    1.  将 `_dirty` 标志置为 `true`。
    2.  调用 `runtime.scheduleUpdate(this)` 将自身加入调度队列。
    3.  **关键联动**: 自动调用 `markNeedsLayout()`，因为重建通常意味着布局可能改变。

```typescript
// 示例：StatefulWidget 使用 setState 触发更新（内部会调用 markDirty）
class InteractiveBox extends StatefulWidget<WidgetProps, { highlight: boolean }> {
  state = { highlight: false };

  onHover() {
    this.setState({ highlight: true });
  }
}
```

### 2.2 markNeedsLayout()

标记当前组件布局失效。

- **API**: `markNeedsLayout(): void`
- **触发**: 修改了影响尺寸或位置的属性（如 `width`, `flex`）。
- **机制 (Relayout Boundary)**:
    -   框架会向上查找最近的 **重布局边界 (Relayout Boundary)**。
    -   如果组件自身大小由父级紧约束决定（如 `FixedSize`），它本身就是边界。
    -   **优化**: 只有边界内的子树会重新布局，边界外的父级不受影响。

```typescript
class ResizableBox extends Widget {
  setSize(w, h) {
    this.width = w;
    this.height = h;
    this.markNeedsLayout(); // 仅触发布局，跳过 Build 阶段
  }
}
```

### 2.3 markNeedsPaint()

标记当前组件需要重绘。

- **API**: `markNeedsPaint(): void`
- **触发**: 修改了仅影响外观不影响布局的属性（如 `color`, `opacity`）。
- **机制**:
    -   将 `_needsPaint` 置为 `true`。
    -   向上递归调用父级的 `markNeedsPaint`，直到遇到 **重绘边界 (Repaint Boundary)**。
    -   **PipelineOwner**: 最终会调用 `owner.schedulePaintFor(boundaryNode)`，将边界节点加入待重绘列表。

#### 更新传播示意图

```mermaid
graph TD
    A[Child Node] -- markNeedsPaint --> B{isRepaintBoundary?}
    B -- No --> C[Parent Node]
    C -- markNeedsPaint --> D{isRepaintBoundary?}
    B -- Yes --> E[PipelineOwner.schedulePaintFor]
    D -- Yes --> E
```

```typescript
class ColorBox extends Widget {
  setColor(c) {
    this.color = c;
    this.markNeedsPaint(); // 极速更新：无 Build，无 Layout，仅 Paint
  }
}
```

### 2.4 isRepaintBoundary

控制重绘边界的核心属性。

- **类型**: `boolean`
- **默认值**: `false`
- **作用**: 当设置为 `true` 时，该组件会拥有独立的离屏 Canvas (Layer)。
    -   **隔离**: 子组件重绘不影响父组件。
    -   **缓存**: 父组件重绘时，如果该组件未脏，直接合成其缓存的 Canvas，无需重绘子树。

#### 典型应用场景

1.  **复杂子树**: 如包含大量节点的图表、地图。
2.  **频繁更新**: 如秒表、动画光标。
3.  **静态背景**: 内容基本不变的背景层。

```typescript
// 示例：将秒表组件设为重绘边界，避免每秒重绘整个页面
class Stopwatch extends StatefulWidget {
  constructor(props) {
    super(props);
    this.type = 'Stopwatch'; // 确保 WidgetRegistry 能正确识别
    this.isRepaintBoundary = true; // 开启重绘边界
  }
  // ...
}
```

## 3. 性能对比

理解不同更新方式的开销对于优化应用至关重要。

| 更新方式 | 涉及阶段 | 复杂度 | 推荐场景 |
|----------|----------|--------|----------|
| `markDirty` | Build -> Layout -> Paint | 高 (O(N)) | 结构变化、增删节点 |
| `markNeedsLayout` | Layout -> Paint | 中 (O(logN) ~ O(N)) | 尺寸变化、位置移动 |
| `markNeedsPaint` | Paint | 低 (O(1) ~ O(Subtree)) | 颜色变化、透明度变化 |

> **性能提示**:
> 1. 尽可能使用 `markNeedsPaint` 而非 `markDirty`。
> 2. 合理使用 `isRepaintBoundary` 隔离频繁更新的区域。
> 3. 在不需要改变大小时，尽量使用固定尺寸的组件作为 Relayout Boundary。

## 4. 脏检查与调度

### 脏检查 (Dirty Checking)
Inkwell 维护了两个主要的脏列表：
1.  **Layout Dirty List**: 需要重新布局的节点。
2.  **Paint Dirty List**: 需要重新绘制的节点（通常是 Repaint Boundary）。

### 调度流程 (Pipeline)
每一帧 (`flushUpdates`) 的执行顺序：

1.  **Flush Layout**: 按深度 **从小到大** (浅 -> 深) 处理脏布局节点。确保父节点先计算约束，传递给子节点。
2.  **Flush Paint**: 按深度 **从大到小** (深 -> 浅) 处理脏绘制节点。确保子节点先更新 Layer，父节点合成时能取到最新内容。
