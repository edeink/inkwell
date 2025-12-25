# 视图变换 (View Transform)

## 1. 概述

在 Inkwell 框架中，视图变换是指将组件的局部坐标系映射到屏幕（或父容器）坐标系的过程。这一过程对于实现缩放（Zoom）、平移（Pan）、旋转（Rotate）等交互效果至关重要。

本文档详细说明了 Inkwell 中的变换矩阵计算原理、与 Flutter 的对比以及在自定义组件（如 `MindMapViewport`）中的实现方式。

## 2. 变换原理

Inkwell 使用基于步骤（Steps）的变换系统，最终组合成 2D 仿射变换矩阵。

### 2.1 坐标空间

主要涉及以下坐标空间：
*   **屏幕空间 (Screen Space)**: 浏览器视口坐标。
*   **世界空间 (World Space)**: 画布根节点的全局坐标。
*   **视口空间 (Viewport Space)**: `MindMapViewport` 组件自身的局部坐标。
*   **内容空间 (Content Space)**: 被视口包裹的内容（如节点）的坐标。

### 2.2 变换流程

渲染管线中的变换流程如下：

1.  **Widget.paint**: 调用 `getSelfTransformSteps()` 获取当前组件的变换步骤。
2.  **Compose**: 将步骤组合成局部变换矩阵 (`localMatrix`)。
3.  **Multiply**: `worldMatrix = parentWorldMatrix * localMatrix`。
4.  **Apply**: 调用 Canvas API (`translate`, `scale`, `rotate`) 应用变换。
5.  **Paint Children**: 子组件在当前变换后的上下文中绘制。

### 2.3 矩阵计算公式

对于 `MindMapViewport`，我们需要实现平移和缩放。

目标公式：
$$ P_{screen} = (P_{content} - Offset_{scroll}) \times Scale + Offset_{viewport} $$

其中：
*   $P_{content}$: 内容原始坐标。
*   $Offset_{scroll}$: 滚动偏移 (`scrollX`, `scrollY`)。
*   $Scale$: 缩放比例 (`_scale`)。
*   $Offset_{viewport}$: 视口平移 (`_tx`, `_ty`)。

在代码中，这通过两级变换实现：

1.  **Viewport 层**: 应用 $Offset_{viewport}$ 和 $Scale$。
    *   变换矩阵: $M_{view} = T(tx, ty) \times S(scale, scale)$
2.  **Child 层**: 应用 $Offset_{scroll}$。
    *   子组件 Offset: $(-scrollX, -scrollY)$
    *   变换矩阵: $M_{child} = T(-scrollX, -scrollY)$

组合后：
$$ P_{final} = M_{view} \times M_{child} \times P_{local} $$
$$ P_{final} = (T(tx) \times S(s)) \times T(-scroll) \times P $$
$$ P_{final} = (P - scroll) \times s + tx $$

这与目标公式完全一致。

## 3. Flutter 对比

| 特性 | Inkwell | Flutter |
| :--- | :--- | :--- |
| **数据结构** | `TransformStep[]` (对象数组) | `Matrix4` (Float64List) |
| **应用方式** | `context.renderer.translate/scale` | `layer.transform = matrix` |
| **层级** | Widget 混合 Layout/Paint | RenderObject 负责 Paint |
| **组合** | `composeSteps` | 矩阵乘法 |

**差异分析**:
*   Inkwell 针对 Canvas 2D 优化，使用步骤描述变换更直观，且易于调试。
*   Flutter 使用 4x4 矩阵，支持 3D 变换，通用性更强但计算开销略大。
*   在 `MindMapViewport` 中，Inkwell 的实现方式足以满足 2D 缩放平移需求，无需引入复杂的矩阵库。

## 4. 代码示例

### MindMapViewport 实现

```typescript
// src/demo/mindmap/custom-widget/mindmap-viewport.ts

protected getSelfTransformSteps(): TransformStep[] {
  // 1. 获取基类变换（通常是父级布局决定的 Offset）
  const steps = super.getSelfTransformSteps();
  
  // 2. 追加视口变换：先平移，后缩放
  // 注意：Canvas 变换是后乘的，但在 API 调用顺序上，
  // 先调用的 translate 会作用于后续的 scale 坐标系？
  // 不，Canvas API:
  // ctx.translate(tx, ty); // 坐标原点移动到 tx, ty
  // ctx.scale(s, s);       // 后续绘制放大 s 倍
  // 效果等同于 T * S
  
  steps.push({ t: 'translate', x: this._tx, y: this._ty });
  steps.push({ t: 'scale', x: this._scale, y: this._scale });
  
  return steps;
}
```

### 验证逻辑

```typescript
// 伪代码
const screenPoint = { x: 100, y: 100 };
const viewport = { tx: 10, ty: 20, scale: 2, scrollX: 5, scrollY: 5 };

// 预期内容坐标
// (100 - 10) / 2 + 5 = 45 + 5 = 50
const contentPoint = { x: 50, y: 50 };

// 正向计算
// (50 - 5) * 2 + 10 = 45 * 2 + 10 = 90 + 10 = 100
// 验证通过
```

## 5. 效果示意图

```mermaid
graph TD
    A[屏幕原点 (0,0)] -->|Translate(tx, ty)| B[视口原点]
    B -->|Scale(s)| C[缩放后的视口]
    C -->|Translate(-scrollX, -scrollY)| D[内容原点]
    D --> E[具体节点]
```
