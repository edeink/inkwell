# 配置指南 (Configuration Guide)

InkWell 运行时 (Runtime) 提供了灵活的配置选项，允许开发者根据应用场景调整渲染行为和性能参数。

## RuntimeOptions

在调用 `Runtime.create(containerId, options)` 时，可以通过 `options` 参数传入配置。

```typescript
interface RuntimeOptions {
  /**
   * 初始宽度
   * 如果未指定，将尝试获取容器元素的 clientWidth
   */
  width?: number;

  /**
   * 初始高度
   * 如果未指定，将尝试获取容器元素的 clientHeight
   */
  height?: number;

  /**
   * 背景颜色
   * @default 'transparent'
   */
  backgroundColor?: string;

  /**
   * 像素比率 (Device Pixel Ratio)
   * 用于高清屏渲染优化。
   * @default window.devicePixelRatio
   */
  dpr?: number;

  /**
   * 是否开启调试模式
   * 开启后可能会显示布局边界、重绘区域等辅助信息。
   * @default false
   */
  debug?: boolean;
}
```

## 常用配置示例

### 1. 基础全屏应用

```typescript
import { Runtime } from '@edeink/inkwell';

const runtime = await Runtime.create('root', {
  // 自动适配容器大小
});
```

### 2. 固定尺寸画布

```typescript
const runtime = await Runtime.create('root', {
  width: 800,
  height: 600,
  backgroundColor: '#ffffff'
});
```

### 3. 高性能模式 (禁用高 DPI)

在某些性能敏感的低端设备上，可以强制 dpr 为 1 以减少像素处理量。

```typescript
const runtime = await Runtime.create('root', {
  dpr: 1
});
```

## 环境变量

InkWell 也支持通过环境变量控制部分行为（主要用于开发阶段）。

- `INKWELL_DEBUG=true`: 开启全局调试日志。
- `INKWELL_PERF_MONITOR=true`: 开启内置性能监控面板。
