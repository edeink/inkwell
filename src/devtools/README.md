# Inkwell DevTools

Inkwell DevTools 是 `@edeink/inkwell` 框架的调试工具，提供组件树查看、属性编辑、元素高亮与交互式拾取功能。

## 1. 架构概览

DevTools 采用 React + Zustand 构建，作为一个独立的覆盖层（Overlay）挂载到应用中。它通过 `Runtime` 单例与核心框架进行通信。

- **入口**: `src/devtools/index.tsx`
- **状态管理**: `src/devtools/store/` (Zustand Stores)
- **UI 组件**: `src/devtools/components/`
- **逻辑 Hooks**: `src/devtools/hooks/`

## 2. 状态管理 (Zustand)

DevTools 全面采用 Zustand 进行状态管理，遵循 Hook First 原则。

### 核心 Stores

- **`usePanelStore`**: 核心业务状态
  - 管理组件树数据 (`treeData`) 与节点映射 (`widgetByNodeKey`)
  - 处理选中 (`selectedNodeKey`)、悬停 (`hoverNodeKey`) 与展开 (`expandedKeys`) 状态
  - 维护 `Runtime` 实例引用与树更新监听
  - 派生状态：`activeInspect` (是否处于拾取模式), `currentRuntime` (当前运行时)

- **`useLayoutStore`**: 界面布局状态
  - 管理面板位置 (`dock`), 尺寸 (`size`), 可见性 (`visible`)
  - 支持 LocalStorage 持久化

- **`useHotkeyStore`**: 快捷键状态
  - 管理全局快捷键绑定与触发

### 数据流向

1. **Action**: 组件触发 Action (如 `setPickedWidget`, `toggleExpand`)
2. **Store**: 更新状态，触发副作用 (如滚动视图, 高亮 Overlay)
3. **Component**: 通过 `useShallow` 订阅状态变化，按需渲染

## 3. 关键功能流程

### 拾取 (Inspect)
1. 开启拾取模式 (`toggleInspect`)
2. `useMouseInteraction` 监听画布鼠标事件
3. 调用 `Runtime.hitTest` 获取 Widget
4. 更新 Store `hoverNodeKey` -> `Overlay` 绘制高亮
5. 点击 Widget -> 更新 Store `selectedNodeKey` -> 树视图定位并选中

### 树同步 (Tree Sync)
1. 监听 `Runtime` 的 `treeHash` 变化 (防抖处理)
2. 重新构建 `DevTreeNode` 树结构
3. 更新 Store `treeData` -> 刷新 UI

## 4. 组件层级

- **DevToolsPanel**: 主面板容器
  - **Overlay**: 画布高亮层 (Portal)
  - **LayoutPanel**: 可拖拽布局
    - **TreePane**: 组件树视图 (虚拟滚动)
    - **PropsPane**: 属性编辑器 (JSON 编辑)
