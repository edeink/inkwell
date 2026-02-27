# DevTools 模块重构文档

## 1. 重构背景
原有的 DevTools 实现中存在以下问题：
- **状态更新闭环 (Infinite Loop)**: `useMouseInteraction` Hook 与 Store 之间存在双向依赖，导致 React Error #185。
- **职责耦合**: UI 组件直接处理复杂的交互逻辑与运行时检测。
- **副作用不可控**: 状态更新触发的副作用分散在各个 Hook 与 Effect 中，难以追踪。

## 2. 新架构设计
采用 **MVC (Model-View-Controller)** 变体架构，将逻辑层从视图层中剥离。

### 2.1 模块划分
- **Store (Model)**: `src/devtools/store`
  - 仅负责存储状态与提供原子更新 Action。
  - 移除所有副作用逻辑 (如 `bindTreeHashListener`)。
  - 确保单向数据流。
- **Logic (Controller)**: `src/devtools/logic`
  - **Interaction**: 处理鼠标/键盘交互、命中测试、Runtime 切换。
  - **Monitor**: 处理 Runtime 树结构轮询、页面可见性监听。
  - **Controller**: 单例控制器，管理上述模块的生命周期。
- **View**: `src/devtools/components`
  - 纯 UI 组件，仅通过 `usePanelStore` 消费状态。
  - 不包含任何复杂的业务逻辑或副作用。

### 2.2 关键改进点
1. **消除了循环依赖**:
   - 交互逻辑 (Interaction) 监听 DOM 事件 -> 更新 Store。
   - 视图 (View) 订阅 Store -> 渲染 UI。
   - 视图不再反向触发交互逻辑的更新。
2. **性能优化**:
   - `throttle`: 鼠标移动事件节流处理 (16ms)。
   - `requestIdleCallback`: 树结构检测在空闲时段进行，避免阻塞主线程。
   - `useShallow`: 组件通过 Zustand shallow selector 精确订阅状态，减少重渲染。
3. **可维护性提升**:
   - 逻辑集中管理，易于测试与调试。
   - 清晰的生命周期管理 (`dispose` 方法)。

## 3. 核心流程
### 3.1 交互流程
1. 用户移动鼠标 -> `DevToolsInteraction` 捕获事件。
2. 计算命中 Runtime 与 Widget -> 调用 `store.setInspectHoverWidget`。
3. Store 更新 -> `DevToolsPanelInner` 重新渲染 Overlay。

### 3.2 监控流程
1. `DevToolsMonitor` 监听 Store 中的 `runtime` 与 `visible` 状态。
2. 当条件满足时，启动 `requestIdleCallback` 轮询。
3. 计算 TreeHash -> 若变更则调用 `store.updateTreeBuild`。
4. Store 更新 -> 树视图组件重新渲染。

## 4. 验证与测试
- 单元测试覆盖了 `Monitor` 与 `Interaction` 的核心逻辑。
- 验证了 Runtime 切换、可见性变化与状态更新的正确性。
