---
title: JSX 编译器
---

# JSX 编译器

JSX 编译器用于把 JSX 元素转换成框架运行时可消费的组件数据（`ComponentData`）。常见用法是：在测试/示例中用 JSX 描述 Widget 树，然后调用 `compileElement` 得到数据，再交给 `WidgetRegistry` 创建并挂载。

## 核心 API

```ts
import { compileElement, compileTemplate } from '@/utils/compiler/jsx-compiler';
import type { AnyElement } from '@/utils/compiler/jsx-compiler';
```

- `compileElement(element: AnyElement): ComponentData`
- `compileTemplate` 是 `compileElement` 的别名

## 基本用法（测试/示例）

```tsx
/** @jsxImportSource @/utils/compiler */
import { compileElement } from '@/utils/compiler/jsx-compiler';
import { WidgetRegistry } from '@/core/registry';
import { createBoxConstraints } from '@/core/base';
import { Container, Text } from '@/core';

import '@/core/registry';

const el = (
  <Container key="root" width={200} height={100}>
    <Text key="title" text="Hello" fontSize={16} />
  </Container>
);

const data = compileElement(el);
const root = WidgetRegistry.createWidget(data)!;
root.createElement(data);
root.layout(createBoxConstraints());
```

## 类型解析规则

- 以组件函数/类的 `name` 作为默认类型名
- 对于函数名以 `*Element` 结尾的情况，会自动去掉 `Element` 后缀（例如 `TextElement` → `Text`）
- 如果传入的是 `Widget` 子类且尚未注册，会尝试自动注册到 `WidgetRegistry`

## 函数组件展开

当 `type` 为普通函数且不是 `Widget` 子类时，编译器会把它当作“函数式组件”执行并递归编译返回值。

## 事件属性处理

- 当属性名形如 `onClick` / `onClickCapture`（以及其它 onXxx 形式）且组件不是 composite 类型时，编译器会把它解析为事件，并写入内部事件字段（用于后续事件系统注册/派发）
- 同时会把函数值原样同步到数据对象上，便于后续构建阶段复用

