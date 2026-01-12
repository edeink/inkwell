# Inkwell Benchmark Guidelines

本文档旨在规范 Inkwell 框架的性能基准测试流程，确保 Widget 渲染性能持续优于原生 DOM。

## 1. 性能优化规则

我们重点优化 `src/runtime` 和 `src/core` 中的通用生命周期方法。以下是核心方法的性能监控列表，按耗时从高到低排序（优化优先级递减）：

| 优先级 | 核心方法 | 典型耗时 (ms) | 描述 |
| :--- | :--- | :--- | :--- |
| **P0** | `Canvas2DRenderer.paint` | *待测* | 实际的 Canvas 绘制指令执行 |
| **P0** | `PipelineOwner.flushLayout` | *待测* | 布局计算阶段（含 `performLayout`） |
| **P1** | `PipelineOwner.flushPaint` | *待测* | 绘制遍历阶段（含 Layer 合成） |
| **P1** | `Widget.build` / `rebuild` | *待测* | Widget 树的构建与 Diff |
| **P2** | `Element.mount` | *待测* | 元素挂载与初始化 |
| **P2** | `Element.update` | *待测* | 属性更新与状态同步 |

> **注**：开发人员需定期运行 Profile 工具更新上述耗时数据，始终优先解决 P0 级瓶颈。

## 2. 优化执行流程

为保证优化的稳定性和可追溯性，必须严格遵守以下流程：

1.  **单步执行**：每次只修改一个变量或优化一个具体的函数逻辑。严禁一次性提交多处无关的性能修改。
2.  **基准验证**：
    *   修改前：运行基准测试，记录基准数据（Baseline）。
    *   修改后：再次运行同一测试。
3.  **决策机制**：
    *   **有效**（耗时减少 > 5% 且无回归）：**采纳**代码并提交。
    *   **无效**（耗时不变或增加）：**回滚**更改，分析原因。
    *   **回归**（功能破坏）：**立即回滚**。
4.  **持续迭代**：在解决当前瓶颈后，重新评估方法耗时排序，进入下一轮优化。

## 3. 性能标准

所有基准测试必须满足以下核心指标，否则视为**未达标**：

*   **Widget vs DOM**: Inkwell Widget 实现的渲染与交互性能必须 **优于 (<)** 原生 DOM 实现。
*   **Frame Budget**: 动画/滚动场景下，单帧处理时间 < **16ms** (60 FPS)。
*   **Test Duration**: 单个 benchmark 测试用例执行时间 < **1s**。

## 4. 优化记录

记录每次优化的关键数据，用于长期跟踪性能趋势。

| 日期 | 优化内容 | 目标方法 | 优化前耗时 | 优化后耗时 | 提升比例 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2024-01-11 | 减少 `dom.spec.ts` 节点规模 | Test Case | 48,108ms | 1,551ms | 96.7% | ✅ 采纳 |
| 2024-01-11 | 优化 `pipeline.spec.ts` 帧数 | Test Case | 1,931ms | < 1,000ms | > 48% | ✅ 采纳 |
| 2026-01-12 | 核心渲染管线与组件优化 | Pipeline Widget | 14 FPS | 386 FPS | 27.6x | ✅ 采纳 |
| 2026-01-12 | 状态更新机制优化 | State Widget | 104 FPS | 941 FPS | 9.0x | ✅ 采纳 |

## 5. 核心优化经验 (2026-01-12 更新)

基于最近的大规模优化实践，我们总结了以下提升 InkWell 性能的关键策略：

### 5.1 运行时与管线 (Runtime & Pipeline)
- **减少全量遍历**：在手动触发布局后，及时清理待处理队列 (`clearNodesNeedingLayout`)，避免后续阶段的无效遍历。
- **智能根节点复用**：在 `renderFromJSON` 中检测根节点类型，支持局部更新而非盲目全量重建，特别是对于尺寸未变的场景。

### 5.2 组件层级 (Core Widgets)
- **事件绑定快速路径**：利用编译器注入的 `__noEvents` 标记，对绝大多数无交互的展示型组件跳过事件绑定逻辑 (`DOMEventManager`)，大幅降低构建开销。
- **绘制指令优化**：在 `_performPaint` 中为纯平移变换 (`translate`) 提供快速路径，避开昂贵的矩阵运算。
- **布局对象池化**：在 `Stack` 和 `Positioned` 中内联定位逻辑，移除临时对象 (`Offset`) 分配；在 `Container` 中复用 `EdgeInsets` 和 `BorderRadius` 对象。

### 5.3 渲染层级 (Renderer)
- **Native API 优先**：使用 `roundRect` 替代手动的 `arc` 路径绘制。
- **状态缓存**：在 Renderer 内部缓存 Context 状态 (fillStyle, lineWidth 等)，减少 DOM 属性赋值带来的性能损耗。
- **编译期优化**：通过 `JSX Compiler` 预处理事件监听器，将运行时开销转移至编译期。

## 6. 基准测试指南

### 运行测试

```bash
# 运行所有基准测试
pnpm run test:benchmark

# 运行特定测试 (如 DOM 指标)
npx vitest run src/benchmark/metrics/__tests__/dom.spec.ts
```

### 验证对齐

在运行性能对比前，必须确保 Widget 实现与 DOM 实现 **像素级对齐 (Pixel-Perfect)**：
*   **尺寸**: 宽高、边距、内边距完全一致。
*   **样式**: 颜色、字体、边框无肉眼可见差异。
*   **布局**: 确保 Flex 布局行为一致。
