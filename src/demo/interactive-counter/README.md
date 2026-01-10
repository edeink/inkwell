# 交互式计数器 (Interactive Counter)

这是一个展示 `@edeink/inkwell` 框架核心功能的交互式演示项目。通过实现一个简单的计数器应用，展示了组件化开发、状态管理、事件处理和多种组件实现方式。

## 目录结构

```
src/demo/interactive-counter/
├── __tests__/                  # 测试用例目录
│   ├── bind-and-dispatch.spec.tsx
│   ├── button-lifecycle.spec.tsx
│   └── ...
├── widgets/                    # 自定义组件目录
│   ├── class-button/           # 类组件实现示例
│   ├── functional-button/      # 函数式组件实现示例
│   ├── raw-button/             # 原生渲染对象组件示例
│   └── performance-monitor/    # 性能监控组件
├── app.tsx                     # 应用主入口组件
├── index.tsx                   # 外部挂载入口
├── index.module.less           # 样式文件
└── type.ts                     # 类型定义
```

## 核心架构与实现

### 1. 组件实现多样性

本项目展示了在 Inkwell 框架中创建组件的三种主要方式，旨在帮助开发者理解不同抽象层级的组件开发模式：

-   **Class Component (`ClassButton`)**:
    -   继承自 `StatefulWidget` 或 `StatelessWidget`。
    -   使用面向对象的方式管理生命周期和状态。
    -   适合逻辑复杂、需要精细控制生命周期的组件。

-   **Functional Component (`FunctionalButton`)**:
    -   使用纯函数定义组件。
    -   语法简洁，易于编写和测试。
    -   适合展示型组件或逻辑较简单的场景。

-   **Raw Widget (`RawButton`)**:
    -   直接操作 `RenderObject`。
    -   继承自 `RenderObjectWidget`。
    -   提供了最低层级的绘制控制（Canvas API），用于高性能或自定义绘制需求。

### 2. 交互逻辑与状态管理

`InteractiveCounterDemo` (`app.tsx`) 作为顶层容器组件，管理着整个应用的共享状态：

-   **状态定义**: `state` 中维护了 `count` (计数)。
-   **事件处理**: `onInc` 方法作为统一的回调函数，被传递给所有子按钮组件。
-   **状态更新**: 当任意按钮被点击时，触发 `onInc`，调用 `this.setState` 更新 `count`，从而触发整个组件树的重新构建（Re-build）。

### 3. 性能监控与 Ref 通信

项目包含一个 `PerformanceMonitor` 组件，用于展示性能优化和组件间通信：

-   **Ref 通信**: 父组件通过 `ref` 获取 `PerformanceMonitor` 的实例引用 (`this.monitorRef`)。
-   **命令式更新**: 在 `onInc` 方法中，除了更新 React 状态外，还直接调用 `this.monitorRef.flash()` 方法，触发监控器的动画效果。这展示了如何在声明式框架中处理必要的命令式逻辑。

## 技术栈与依赖

-   **Core Framework**: `@edeink/inkwell` (核心渲染引擎)
-   **Runtime**: `Runtime` (运行时环境，负责调度和渲染循环)
-   **Styling**: `ThemePalette` (主题系统)
-   **Testing**: Vitest (单元测试框架)

## 代码执行流程

1.  **初始化**: `runApp` 函数被调用，初始化 `Runtime` 并挂载 `InteractiveCounterDemo` 组件。
2.  **构建**: `InteractiveCounterDemo` 的 `render` 方法被执行，构建包含 `Column`、`Row` 以及三种 `Button` 和 `PerformanceMonitor` 的组件树。
3.  **渲染**: Inkwell 引擎将组件树转换为 RenderObject 树，并绘制到 Canvas 上。
4.  **交互**:
    -   用户点击任意按钮 (Class/Functional/Raw)。
    -   触发 `onInc` 回调。
    -   `setState` 更新 `count`。
    -   `PerformanceMonitor.flash()` 被调用。
5.  **更新**: 引擎检测到状态变化，触发 Layout 和 Paint 流程，更新界面显示。

## 关键代码示例

**主组件状态管理 (`app.tsx`):**

```typescript
export class InteractiveCounterDemo extends StatefulWidget<Props, State> {
  // ...
  private onInc = (): void => {
    // 更新自身状态
    this.setState({ count: this.state.count + 1 });

    // 性能监控器闪烁 (Ref通信)
    if (this.monitorRef) {
      this.monitorRef.flash();
    }
  };
  // ...
}
```
