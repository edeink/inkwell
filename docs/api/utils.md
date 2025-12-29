---
id: utils
title: 工具函数
sidebar_position: 2
---

# 工具函数

Inkwell 提供了一系列工具函数来辅助开发和测试。

## findWidget

`findWidget` 是一个强大的组件查找工具，类似于 DOM 的 `querySelector`。它允许你通过 ID、类型、属性等选择器在 Widget 树中查找特定的组件。

### 方法签名

```typescript
function findWidget<T = Widget>(
  node: Widget | null,  // 查找的起始节点（通常是根节点）
  selector: string,     // 选择器字符串
  options?: FindOptions // 可选配置
): T | T[] | null;

interface FindOptions {
  multiple?: boolean;   // 是否返回所有匹配项 (默认 false)
  context?: Widget;     // 上下文节点 (同 node)
}
```

### 选择器语法

支持以下类似 CSS 的选择器语法：

| 选择器类型 | 语法 | 示例 | 说明 |
| :--- | :--- | :--- | :--- |
| **ID 选择器** | `#id` | `#my-btn` | 匹配 `key` 属性为 `my-btn` 的组件 |
| **类型选择器** | `Type` | `Container` | 匹配组件类名或 `type` 属性为 `Container` 的组件 |
| **属性选择器** | `[attr="val"]` | `[data-type="node"]` | 匹配 `props` 或 `data` 中包含指定属性值的组件 |
| **后代选择器** | `A B` | `Row Text` | 匹配 `Row` 内部的所有 `Text` 组件 |
| **子代选择器** | `A > B` | `Column > Button` | 匹配 `Column` 直接子级的 `Button` 组件 |

### 返回值

- **默认**: 返回找到的第一个匹配组件 (`T | null`)。
- **multiple: true**: 返回所有匹配组件的数组 (`T[]`)。

### 使用示例

```typescript
import { findWidget } from '@/core/helper/widget-selector';
import { CustomComponentType } from '@/demo/mindmap/types';

// 1. 查找 ID 为 'node-1' 的组件
const node = findWidget(root, '#node-1');

// 2. 查找所有的 Text 组件
const texts = findWidget(root, 'Text', { multiple: true });

// 3. 查找特定视口下的节点
const nodesInViewport = findWidget(root, 'MindMapViewport > MindMapNode', { multiple: true });

// 4. 结合类型断言使用
const viewport = findWidget<MindMapViewport>(root, `#${CustomComponentType.MindMapViewport}`);
if (viewport) {
  viewport.scale = 2.0;
}
```

### 常见使用场景

1.  **集成测试**: 在测试中查找特定组件以验证其状态或属性。
2.  **调试**: 在控制台中快速定位组件实例。
3.  **交互逻辑**: 在事件处理中根据 ID 查找目标组件（需谨慎使用，避免破坏数据流）。

### 注意事项

- **性能**: `findWidget` 会遍历组件树，频繁调用可能影响性能。建议在每一帧中避免大量使用，或利用其内置的缓存机制（注意缓存失效时机）。
- **唯一性**: 虽然框架不强制 `key` 全局唯一，但为了查找准确，建议对重要组件使用唯一的 `key`。
