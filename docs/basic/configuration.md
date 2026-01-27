---
id: configuration
title: 配置指南
sidebar_position: 5
---

# 配置指南

Inkwell 的运行时（Runtime）提供了少量但关键的参数，用于控制渲染器类型、清晰度、背景以及离屏渲染等行为。

## RuntimeOptions

在调用 `Runtime.create(containerId, options)` 时可以传入配置：

```ts
interface RuntimeOptions {
  renderer?: 'canvas2d' | string;
  antialias?: boolean;
  resolution?: number;
  background?: string | number;
  backgroundAlpha?: number;
  enableOffscreenRendering?: boolean;
}
```

### 字段说明

- `renderer`：渲染器类型，当前内置为 `canvas2d`。
- `antialias`：是否开启抗锯齿，默认开启。
- `resolution`：渲染分辨率倍率（越大越清晰，开销也越高）。用于替代传统 “dpr” 的概念，并允许在同一设备上按需调节。
- `background`：背景色，支持 `'#ffffff'` 或 `0xffffff` 两种写法。
- `backgroundAlpha`：背景透明度（0~1），默认 0（透明）。
- `enableOffscreenRendering`：是否开启离屏渲染（主要影响 `RepaintBoundary` 等隔离绘制策略），默认关闭。

## 常用配置示例

### 1. 使用默认配置创建运行时

```ts
import Runtime from '@/runtime';

const runtime = await Runtime.create('root');
```

### 2. 设置白色不透明背景

```ts
import Runtime from '@/runtime';

const runtime = await Runtime.create('root', {
  background: '#ffffff',
  backgroundAlpha: 1,
});
```

### 3. 降低分辨率以换取更高性能

在性能敏感的场景中，可以降低 `resolution` 以减少像素处理量：

```ts
import Runtime from '@/runtime';

const runtime = await Runtime.create('root', {
  resolution: 2,
});
```
