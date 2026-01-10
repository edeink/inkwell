# 思维导图 (Mindmap)

这是一个功能完备的思维导图应用演示，展示了 `@edeink/inkwell` 框架在处理复杂图形布局、高性能交互和数据可视化方面的能力。

## 目录结构

```
src/demo/mindmap/
├── __tests__/                  # 详尽的集成测试与单元测试
├── app.tsx                     # 应用入口组件 (MindmapDemo)
├── constants/                  # 常量定义 (主题、配置)
├── components/                 # UI 组件 (React层)
│   ├── minimap/                # 缩略图导航
│   ├── toolbar/                # 工具栏
│   ├── zoom-bar/               # 缩放控制条
│   └── error-boundary/         # 错误边界
├── controller/                 # 核心逻辑控制器
│   ├── modules/                # 功能模块 (交互、布局、视图)
│   ├── plugins.ts              # 插件系统定义
│   └── index.ts                # MindmapController
├── helpers/                    # 辅助工具库
│   ├── layout-engine/          # 布局算法引擎 (核心)
│   ├── shortcut/               # 快捷键系统
│   ├── connection-drawer.ts    # 连线绘制逻辑
│   └── state-helper.ts         # 状态管理辅助
├── hooks/                      # React Hooks
├── widgets/                    # Inkwell Widget 组件
│   ├── connector/              # 连接线组件
│   ├── mindmap-layout/         # 布局容器组件
│   ├── mindmap-node/           # 节点组件
│   ├── mindmap-viewport/       # 视口控制组件
│   └── ...
├── index.tsx                   # 外部挂载点
└── type.ts                     # 类型定义
```

## 核心架构与实现

### 1. 核心算法与数据结构

思维导图的核心在于布局算法和图数据结构：

-   **数据结构**: 采用 **图 (Graph)** 结构存储，节点 (`GraphNode`) 通过 ID 索引，边 (`GraphEdge`) 记录连接关系。
-   **布局引擎 (`LayoutEngine`)**:
    -   位于 `helpers/layout-engine/`。
    -   支持多种布局模式：`tree` (单向树状), `treeBalanced` (平衡树状), `radial` (放射状)。
    -   **平衡算法**: `computeBalancedDepthAware` 实现了智能的左右平衡算法，根据子树高度动态分配节点位置，避免重叠并保持视觉平衡。

### 2. 渲染引擎工作原理

利用 Inkwell 的高性能渲染管线：

-   **MindMapViewport**: 负责处理视口的平移 (`scrollX/Y`) 和缩放 (`scale`)。它是一个 `RenderObjectWidget`，直接处理 Canvas 变换矩阵。
-   **MindMapLayout**: 自定义布局组件，接收计算好的节点位置信息，将子组件 (`MindMapNode`) 放置在精确坐标上。
-   **连接线绘制**: `Connector` 组件根据起点和终点，使用贝塞尔曲线 (`Bezier Curve`) 绘制平滑的连接线。

### 3. 用户交互事件处理

交互逻辑被解耦在 `MindmapController` 中：

-   **MindmapController**: 作为 MVC 模式中的 Controller，协调 View (Widget) 和 Model (State)。
-   **InteractionModule**: 处理点击、拖拽、选中等交互行为。
-   **ViewModule**: 管理视口状态同步。
-   **事件流**: 用户操作 -> Widget 捕获事件 -> Controller 处理逻辑 -> 更新 State -> 触发 Re-build -> 界面更新。

### 4. 性能优化

-   **局部重绘**: 仅在节点状态改变时更新特定节点，避免全量刷新。
-   **Canvas 变换**: 利用 Canvas 2D 的 `transform` API 进行零成本的缩放和平移。
-   **虚拟化**: (待实现) 对于超大规模导图，可仅渲染视口内的节点。
-   **事件节流**: 在 `HighlightOverlay` 等组件中使用 `requestAnimationFrame` 和节流技术优化高频事件处理。

## 扩展接口

项目设计了插件化架构，便于功能扩展：

-   **Controller Plugins**: `MindmapController` 支持注册插件 (`ControllerPlugin`)，可以挂载自定义的初始化逻辑或事件监听。
-   **Widget 扩展**: `MindMapNode` 支持自定义渲染内容，通过 `CustomComponentType` 进行类型识别。

## 技术要点

-   **MVC 架构**: 视图与逻辑分离。
-   **复杂算法**: 递归树布局、碰撞检测。
-   **混合渲染**: 结合 Inkwell (Canvas) 渲染图形区和 React (DOM) 渲染工具栏/缩略图。
```
