# Inkwell DevTools

Inkwell DevTools 是 `@edeink/inkwell` 框架的调试工具，提供组件树查看、属性编辑、元素高亮与交互式拾取功能。

## 1. 项目整体架构

DevTools 采用 React + Ant Design 构建，作为一个独立的覆盖层（Overlay）挂载到应用中。它通过 `Runtime` 单例与核心框架进行通信。

- **入口层**: `src/devtools/index.tsx`。负责单例管理 (`Devtools` class) 和 React 根节点挂载。
- **UI 层**: `src/devtools/components/`。包含面板布局 (`LayoutPanel`)、树视图、属性编辑器等。
- **逻辑层**: `src/devtools/hooks/`。`useMouseInteraction` 处理画布交互，`useDevtoolsHotkeys` 处理快捷键。
- **数据转换**: `src/devtools/helper/tree.ts`。将 Inkwell Widget 树转换为 UI 可用的树结构。

## 2. 主要组件及其功能

| 组件 | 路径 | 描述 |
| --- | --- | --- |
| **DevTools** | `src/devtools/index.tsx` | 对外暴露的 React 组件，作为单例的启动入口。 |
| **DevToolsPanel** | `src/devtools/components/DevToolsPanel.tsx` | (重构后) 核心面板组件，包含树、搜索、交互逻辑。 |
| **LayoutPanel** | `src/devtools/components/layout/index.tsx` | 提供可拖拽、停靠 (Dock) 的布局容器。 |
| **Overlay** | `src/devtools/components/overlay/index.ts` | 负责在 Canvas 上绘制高亮边框和提示信息。 |
| **PropsEditor** | `src/devtools/components/props-editor/index.tsx` | 显示并编辑当前选中 Widget 的属性。 |

## 3. 核心 API 接口

### `Devtools` (Singleton Class)
管理 DevTools 面板的生命周期。

- `getInstance(props?)`: 获取或创建单例。
- `show() / hide()`: 控制面板显示/隐藏。
- `dispose()`: 销毁实例，清理 DOM。
- `update(props?)`: 更新属性。

### `useMouseInteraction` (Hook)
处理鼠标在 Canvas 上的移动和点击事件。

- **输入**: `runtime`, `overlay`, `active` (是否开启 inspect)。
- **输出**: `onPick` (选中回调), `runtimeId` (当前画布 ID)。
- **功能**: 利用 `hitTest` 识别鼠标下的 Widget，并调用 `overlay` 高亮。

## 4. 重要数据结构和状态管理

### Widget Tree Transformation
- **`Widget` (Core)**: 运行时组件节点。
- **`DevTreeNode` (DevTools)**: 轻量级树节点，用于 Antd Tree 展示。
  ```ts
  type DevTreeNode = {
    key: string;
    type: string;
    props?: Record<string, unknown>;
    children: DevTreeNode[];
  };
  ```

### State Management
DevTools 内部使用 React `useState` 管理状态，不依赖外部 Redux/MobX。
- `selected`: 当前选中的 Widget。
- `expandedKeys`: 树的展开状态。
- `runtime`: 当前调试的 Runtime 实例。

## 5. 关键业务逻辑流程

### Inspect (拾取) 流程
1. 用户点击 "Inspect" 按钮 (`activeInspect = true`)。
2. `useMouseInteraction` 监听 `mousemove`。
3. 调用 `Runtime` 的 `hitTest` 获取鼠标下的 Widget。
4. 调用 `Overlay.highlight(widget)` 绘制高亮框。
5. 用户点击 `click` -> 触发 `onPick(widget)`。
6. `DevToolsPanel` 更新 `selected`，计算路径并展开树节点 (`setExpandedKeys`)。
7. `Tree` 组件滚动到对应节点。

### Tree 联动流程
1. `Runtime` 发生变化 (如 `rebuild`)。
2. `DevToolsPanel` 重新计算 `treeData` (`toTree`)。
3. `Tree` 组件刷新展示。
4. 用户在 `Tree` 中 Hover/Select -> 触发 `findWidget` 查找 Widget -> 调用 `Overlay` 高亮。
