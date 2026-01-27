# 布局基准样式对齐报告

本文档记录了为对齐 `src/benchmark/tester/layout/widget.tsx` 的基线实现，而对 `src/benchmark/tester/layout/dom.tsx` 所做的样式调整。

## 基线（Widget 实现）
- **根节点**：`Container`（白底） -> `Wrap`（spacing=2, runSpacing=2）。
- **链路根**：`Container`（50x50）。
- **节点结构**：递归深度 20。
  - **偶数层**：`Container`（padding=1）-> `Center`。
  - **奇数层**：`Stack` -> `Positioned`（四边为 1）-> `Container`（border: 1px solid rgba(0,0,0,0.1)）。
- **叶子节点**：`Container`（100x100，颜色 #4caf50 或 #2196f3）。

## DOM 实现调整

| Component | Widget Property | Previous DOM Style | Adjusted DOM Style | Reason |
|-----------|-----------------|--------------------|--------------------|--------|
| **Root** | `Wrap(spacing=2)` | item 上使用 `margin: 1px` | 容器使用 `gap: 2px` | `Wrap` 的间距语义是“子项之间留空”，而不是“子项四周外边距”；`gap` 更接近该行为。 |
| **偶数层节点** | `Center`（Flex 居中） | `display: flex...` | 增加 `position: relative` | 作为后续绝对定位（奇数层）子节点的锚点，更贴近 `Stack` 的定位语义。 |
| **奇数层节点** | `Positioned`（top/left/right/bottom=1） | `top: 1px...` | 无变化（已验证） | 已与 Widget 行为一致。 |
| **叶子节点** | `width/height: 100` | `width/height: 100px` | 无变化（已验证） | 已与 Widget 行为一致。 |
| **颜色** | 根节点 `#fff`，叶子 `#4caf50/#2196f3` | 一致 | 一致 | 已验证颜色值。 |

## 验证
- **视觉**：按代码定义对齐并核对样式效果。
- **结构**：DOM 树深度与 Widget 树的逻辑深度一致。
- **布局**：使用 Flexbox `gap` 使间距行为与 Inkwell `Wrap` 更一致。
