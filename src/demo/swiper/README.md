# 轮播组件 (Swiper)

这是一个基于 `@edeink/inkwell` 框架实现的高性能、可触摸滑动的轮播组件演示。展示了框架在处理复杂手势、物理动画和定时任务方面的能力。

## 目录结构

```
src/demo/swiper/
├── __tests__/                  # 测试用例
├── widgets/                    # 核心组件实现
│   └── swiper/
│       ├── index.tsx           # Swiper 组件核心逻辑
│       └── easing.ts           # 贝塞尔曲线缓动函数
├── app.tsx                     # 演示应用入口
├── components.tsx              # 演示用的展示卡片组件
└── index.tsx                   # 外部挂载点
```

## 核心架构与实现

### 1. 物理模型与动画

Swiper 组件并没有使用 CSS 动画，而是通过 Inkwell 的渲染循环 (`requestAnimationFrame`) 实现了基于物理的动画系统：

-   **状态管理**: `Swiper` 组件维护 `currentIndex` (当前索引) 和 `offset` (偏移量)。
-   **动画引擎**: `animateTo` 方法驱动每一帧的更新。
-   **缓动函数**: `easing.ts` 中实现了三次贝塞尔曲线 (`Cubic Bezier`) 算法，特别是 `easeSharp` 曲线，提供了接近原生系统的流畅滑动回弹手感。

### 2. 触摸事件处理

组件实现了完整的触摸/鼠标交互逻辑，支持 "拖拽-跟随-释放" 的交互模式：

-   **事件捕获**: 监听 `onPointerDown`, `onPointerMove`, `onPointerUp` 事件。
-   **拖拽跟随**: 在 `dragging` 状态下，内容直接跟随手指移动 (`setState({ offset: delta })`)，实现 1:1 的跟手效果。
-   **惯性判断**: 释放时，根据拖拽距离和速度判断是回弹还是切换到下一页。

### 3. 自动播放机制

-   **生命周期管理**: 在 `createElement` 和组件销毁时正确处理定时器 (`setInterval`)。
-   **交互暂停**: 当用户正在触摸/拖拽 (`dragging`) 或鼠标悬停 (`isHovering`) 时，自动暂停轮播，用户操作结束后恢复。

### 4. 无限循环 (Infinite Loop)

*(注：当前演示版本为基础版，若涉及无限循环通常采用以下策略)*
-   在首尾追加克隆节点。
-   当滑动到克隆节点时，瞬间无缝跳转到真实节点位置 (`offset` 重置)，从而制造无限滚动的视觉错觉。

## 性能优化策略

-   **RequestAnimationFrame**: 所有的动画更新均由 RAF 驱动，确保 60fps 流畅度。
-   **按需渲染**: 仅渲染当前可见的 Slide 及其相邻的预加载 Slide。
-   **Layer 合成**: 利用 Inkwell 的 RenderObject 树结构，将 Slide 内容包裹在独立的绘制层中，减少重绘开销。

## 配置参数

`Swiper` 组件支持丰富的配置：

-   `items`: 轮播内容组件数组。
-   `autoplay`: 是否自动播放 (boolean)。
-   `interval`: 自动播放间隔 (ms)。
-   `duration`: 滑动动画时长 (ms)。
-   `theme`: 主题配置。

## 技术栈

-   **Core**: `@edeink/inkwell`
-   **Animation**: Custom Cubic Bezier Easing
-   **Gesture**: Pointer Events
```
