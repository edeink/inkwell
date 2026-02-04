---
title: Widget 选择器
---

# findWidget

`findWidget` 是一个组件查找工具，提供类似 DOM `querySelector` 的体验，用选择器在 Widget 树中定位组件实例。

## 导入

```ts
import { findWidget, clearSelectorCache } from '@/core/helper/widget-selector';
```

## 方法签名

```ts
import type { Widget } from '@/core/base';

export interface FindOptions {
  multiple?: boolean;
  context?: Widget | null;
}

export function findWidget<T = Widget>(
  node: Widget | null,
  selector: string,
  options?: FindOptions,
): T | T[] | null;
```

## 选择器语法

支持以下选择器片段与组合方式：

| 类型 | 语法 | 示例 | 说明 |
| :--- | :--- | :--- | :--- |
| ID | `#id` | `#node-1` | 匹配 `widget.key === "node-1"` |
| Type | `Type` | `Container` | 匹配 `widget.type`（忽略 `Stub` 后缀差异） |
| Class | `.class` | `.selected` | 匹配 `widget.data.className`（字符串或数组），也会把 `.Text` 视为匹配 `type=Text` |
| Attr | `[name]` / `[name="value"]` | `[disabled]` / `[role="toolbar"]` | 优先匹配 `widget.data[name]`，缺失时回退匹配 `widget[name]` |
| 伪类 | `:active` / `:root` | `:active` | `:active` 匹配 `widget.data.active === true` 或 `widget.active === true`；`:root` 匹配“逻辑根”（无 parent 或 parent 中不存在指向自身的连接引用） |
| 后代 | `A B` | `Row Text` | 后代组合（递归遍历） |
| 子代 | `A > B` | `Column > Button` | 仅匹配直接子级 |

## 返回值与缓存

- 默认返回第一个匹配项：`T | null`
- `multiple: true` 返回全部匹配项：`T[]`
- 当 `multiple: true` 时，会以 `node` 为根建立缓存；组件树变更后需要清理缓存：

```ts
clearSelectorCache(root);
```


## 使用示例

```ts
import { findWidget } from '@/core/helper/widget-selector';
import type { Text } from '@/core';

const title = findWidget<Text>(root, '#title');
const allText = findWidget(root, 'Text', { multiple: true });
const activeNodes = findWidget(root, 'MindMapNode:active', { multiple: true });
const toolbarButtons = findWidget(root, 'MindMapViewport > Container[role="toolbar"] Button', {
  multiple: true,
});
```

## 混淆警告

如果你的选择器依赖“类型字符串”（例如 `MindMapNode`），而你的构建产物会对类名/函数名做混淆压缩，那么运行时生成的类型名可能与源码不同，从而导致 `findWidget` 在生产环境查找失败。

建议：

1. 在相关构建（例如 Vite）中开启 `keepNames`，尽量保持 `constructor.name` 在构建前后一致：

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    keepNames: true,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
});
```

2. 如果必须混淆且无法保留名称，请不要在 `findWidget` 里手写类型字符串；改用构造器的运行时名称生成选择器，确保混淆前后一致：

```ts
import { findWidget } from '@/core/helper/widget-selector';
import { MindMapNode } from '@/demo/mindmap/widgets/mindmap-node';

const type = MindMapNode.prototype.constructor.name;
const node = findWidget(root, `${type}#node-1`);
```
