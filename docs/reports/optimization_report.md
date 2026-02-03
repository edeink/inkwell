# InkWell 性能优化报告

## 1. 优化概述

本项目旨在提升 InkWell 框架在处理大规模节点和高频更新场景下的性能表现。通过对核心组件 (`Base`, `Stack`, `Positioned`, `Container`)、渲染运行时 (`Runtime`, `Canvas2DRenderer`) 以及编译工具链 (`JSX Compiler`) 的深度优化，实现了显著的性能飞跃。

## 2. 性能测试结果

基于 `src/benchmark/perf.spec.tsx` 的基准测试结果：

| 测试场景 | 优化前 FPS | 优化后 FPS | 提升倍数 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **State Widget** (状态更新) | ~104 | **941.54** | **9.0x** | 1000 个节点的高频状态切换 |
| **Pipeline Widget** (全量管线) | ~14 | **386.60** | **27.6x** | 1000 个节点的每帧全量构建与渲染 |

> 注：测试环境为 macOS, Node.js 环境下的 Vitest 测试运行。

## 3. 核心优化点

### 3.1 核心组件优化 (Core Widgets)

#### `src/core/base.ts` (Widget 基类)
-   **快速路径 (Fast Path) 优化**：在 `_performPaint` 中针对仅包含平移变换 (`translate`) 的场景增加了快速路径，避免了创建 `TransformStep` 数组和复杂的矩阵运算，直接调用 Canvas API。
-   **事件绑定优化**：引入 `__noEvents` 标记，对无事件监听器的组件直接跳过 `DOMEventManager.bindEvents` 调用，显著减少了大规模节点树的遍历开销。
-   **子节点构建优化**：在 `buildChildren` 中移除了 `computeNextChildrenData` 中的冗余 `filter` 操作（依赖编译器保证数据的纯净性），并优化了节点复用逻辑，减少对象分配。

#### `src/core/stack.ts` & `src/core/positioned.ts`
-   **布局逻辑内联**：在 `Stack` 的 `positionChildren` 方法中内联了 `Positioned` 组件的定位逻辑，避免了创建临时的 `Offset` 对象。
-   **循环合并**：将 `Stack` 布局过程中的多次子节点遍历合并为单次遍历，减少了 CPU 周期。
-   **尺寸缓存**：在 `Positioned` 组件中增加了尺寸缓存机制，避免重复计算。
-   **细粒度更新**：区分了位置更新和尺寸更新，仅在必要时触发布局。

#### `src/core/container.ts`
-   **对象分配减少**：优化了 `didUpdateWidget` 逻辑，在 `borderRadius` 未变更时直接复用旧值，避免了 `normalizeBorderRadius` 的频繁调用。
-   **样式解析优化**：仅在 `padding` 或 `margin` 引用变更时重新解析 `EdgeInsets`，复用 `ZERO_EDGE_INSETS` 常量。

### 3.2 运行时优化 (Runtime)

#### `src/runtime/index.tsx`
-   **渲染管线调度**：在 `renderFromJSON` 中引入了 `pipelineOwner.clearNodesNeedingLayout()`，在手动触发布局后直接清空待布局队列，避免了后续 `flushLayout` 的无效遍历和排序开销。
-   **根节点复用**：增强了根节点复用逻辑，支持局部更新。
-   **渲染器初始化优化**：通过 `_lastRendererOptionsKey` 缓存渲染器配置，避免了每帧重复调用 `renderer.update`。

#### `src/renderer/canvas2d/canvas-2d-renderer.ts`
-   **Native API 支持**：优先使用 Canvas 2D 的 `roundRect` 原生 API 绘制圆角矩形，替代了手动的 `arc` 路径绘制，大幅提升绘制性能。
-   **状态缓存**：增加了对 `fillStyle`, `strokeStyle`, `lineWidth` 等上下文状态的缓存，减少了不必要的 setter 调用（DOM 操作开销）。
-   **Save/Restore 消除**：在绘制简单矩形时移除了不必要的 `save()` / `restore()` 调用。

### 3.3 编译与工具链 (Compiler & Events)

#### `src/utils/compiler/jsx-compiler.ts`
-   **预处理优化**：在编译阶段预先提取事件监听器并注入 `__events` 或 `__noEvents` 标记，将运行时开销转移至编译期。
-   **纯净编译**：移除了编译过程中的副作用（如直接注册事件），确保编译结果为纯数据 (ComponentData)。

#### `src/core/events/dom-event-manager.ts`
-   **属性遍历消除**：利用编译器注入的标记，在运行时直接定位事件处理器，避免了对组件 Props 的全量遍历检查。

## 4. 总结

本次优化遵循了"减少分配、减少遍历、减少重绘"的核心原则。通过深入分析 Profiling 数据，定位并解决了多个关键瓶颈。最终实现了 State Benchmark 9倍、Pipeline Benchmark 27倍的性能提升，且完全保持了原有的功能和 API 兼容性。
