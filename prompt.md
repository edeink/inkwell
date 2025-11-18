# 项目协作提示（供 AI 助手）

## 项目目的
- 实现类似 Flutter 的 UI 构建 → 布局 → 绘制流水线，用于图形编辑与可视化渲染。
- 以声明式 JSON/JSX 模板定义 Widget 树，驱动跨渲染引擎的绘制（Canvas2D、PixiJS、Konva）。
- 编辑器将组件树解析、布局为确定尺寸后，再调用渲染器进行像素级绘制。

## 技术栈
- 核心：`TypeScript` 严格模式、模块化（`ESNext`）、Vite 构建、React 19 用于演示页面。
- 渲染器：`Canvas2D`、`PixiJS`、`Konva`，统一遵循 `IRenderer` 接口。
- 模板转换：通过 `jsx-to-json` 将 JSX 转为组件 JSON 数据。

## 关键架构
- 编辑器入口：`Editor.create(containerId, options)`，从 JSON 渲染组件树并完成布局与绘制。
  - 解析与渲染流程参见 `src/editors/graphics-editor.tsx:176`。·
- Widget 抽象基类：统一 `layout`（计算尺寸与子项定位）与 `paint`（绘制自身与子项）。
  - 方法入口参见 `src/core/base.ts:206`（`layout`）与 `src/core/base.ts:285`（`paint`）。
- 渲染器统一接口：定义跨引擎必须实现的方法，供 `paint` 调用。
  - 接口定义参见 `src/renderer/IRenderer.ts:23`。

## 渲染器接口约定（IRenderer）
- 必选方法：
  - `initialize(container, options)`：初始化并挂载画布。
  - `resize(width, height)`：调整画布尺寸。
  - `render()`：渲染一帧（立即或驱动 ticker）。
  - `destroy()`：释放资源并清空容器。
  - `getRawInstance()`：返回原始引擎实例（用于高级控制）。
- 绘制相关：
  - `save()` / `restore()` / `translate(x, y)`：坐标系状态管理；`Widget.paint` 依赖此约定进行子项偏移。
  - `drawText(...)` / `drawRect(...)` / `drawImage(...)`：基础绘制原语，所有 Widget 绘制通过此层调用。
- 参考实现：
  - Canvas2D 初始化与绘制实现：`src/renderer/canvas2d/Canvas2DRenderer.ts:19`、`src/renderer/canvas2d/Canvas2DRenderer.ts:185`、`src/renderer/canvas2d/Canvas2DRenderer.ts:238`、`src/renderer/canvas2d/Canvas2DRenderer.ts:271`。
  - PixiRenderer 初始化与绘制实现：`src/renderer/pixi/PixiRenderer.ts:29`、`src/renderer/pixi/PixiRenderer.ts:170`、`src/renderer/pixi/PixiRenderer.ts:247`、`src/renderer/pixi/PixiRenderer.ts:304`。
  - KonvaRenderer 初始化与绘制实现：`src/renderer/konva/KonvaRenderer.ts:17`、`src/renderer/konva/KonvaRenderer.ts:148`、`src/renderer/konva/KonvaRenderer.ts:186`、`src/renderer/konva/KonvaRenderer.ts:214`。

## Widget 系统规范
- 类型与注册：
  - 每个 Widget 子类需在静态初始化中注册类型，类型字符串大小写敏感，需与 JSON 中 `type` 匹配。
    - 例：`Text` 注册参见 `src/core/text.ts:55`；`Container` 注册参见 `src/core/container.ts:55`。
  - 通过 `Widget.createWidget(data)` 按 `data.type` 查找构造器并创建实例（`src/core/base.ts:115`）。
- 生命周期方法：
  - `createChildWidget(childData)`：从子项数据递归创建 Widget（`src/core/base.ts:200`）。
  - `performLayout(constraints, childrenSizes)`：返回自身 `Size`，并由基类完成子项定位（`src/core/base.ts:276`）。
  - `paintSelf(context)`：仅绘制自身内容，坐标原点为当前组件左上角；子项绘制与坐标偏移由基类处理（`src/core/base.ts:311`）。
- 坐标与绘制：
  - 基类在绘制子项前调用 `renderer.save()`、`renderer.translate(dx,dy)`，绘制完成后 `renderer.restore()`（`src/core/base.ts:291`～`src/core/base.ts:305`）。
  - Widget 的 `paintSelf` 内必须以局部坐标系（0,0）进行绘制。
- 布局与约束：
  - 使用 `BoxConstraints` 统一约束（最小/最大宽高），并由每个 Widget 决定传递给子项的约束（`getConstraintsForChild`）。
  - Flex 系列：
    - `Column` 与 `Row` 支持 `MainAxisAlignment`、`CrossAxisAlignment`、`MainAxisSize` 与 `spacing` 等（`src/core/flex/column.ts:31`、`src/core/flex/row.ts:26`）。
    - 通过 `Expanded` 与子项 `flex` 属性分配主轴空间，`Tight` 表示强制占满、`Loose` 可小于分配值（`src/core/flex/type.ts:36`、`src/core/flex/expanded.ts:21`）。
  - 典型容器：`Container`、`Padding`、`Center`、`Stack`、`SizedBox` 等，分别处理尺寸、边距、居中、层叠与固定尺寸。

## 错误与约束（Flutter 风格）
- 不允许在主轴约束为无限（`unbounded`）时使用具有非零 `flex` 的子项：
  - 典型报错由 `createRenderFlexUnboundedError('vertical'|'horizontal')` 生成（`src/core/flex/errors.ts:22`）。
  - `Column` 在 `maxHeight` 无限且存在 `flex` 子项且 `mainAxisSize` 为 `max` 时抛错（`src/core/flex/column.ts:136`～`src/core/flex/column.ts:143`）。
- 文本度量：优先使用 Canvas 精确测量，不可用时退化为估算方法（`src/core/text.ts:113` 与 `src/core/text.ts:205`）。

## 模板与数据
- JSX → JSON 转换：在演示与测试中以 JSX 定义结构，转换后交由编辑器渲染。
  - 转换入口：`src/utils/jsx-to-json.tsx:311`；模板函数：`src/utils/jsx-to-json.tsx:320`。
  - 组件类型枚举来源：`src/editors/graphics-editor.tsx:26`。
- 示例数据：完整演示场景见 `src/test/data.tsx`，测试页面入口见 `src/test/test-page.tsx`。

## 代码风格与工程约束
- TypeScript：`strict: true`，`noUnusedLocals/Parameters: true`，`moduleResolution: 'bundler'`，`verbatimModuleSyntax: true`。
  - 配置参见 `tsconfig.app.json:2` 与 `tsconfig.node.json:2`。
- ESLint：使用 `@eslint/js`、`typescript-eslint` 推荐规则，React Hooks 与 Vite 刷新插件；无自定义规则。
  - 配置参见 `eslint.config.js:8`～`eslint.config.js:22`。
- 命名与文件：
  - 类与组件类型使用 `PascalCase`，文件名常见 `camelCase.ts` 或明确模块名。
  - 组件 `type` 字段大小写敏感，需与注册值一致（常为 `PascalCase`）。
- 依赖管理：`pnpm`/`npm` 均可；开发脚本：`dev`、`build`、`preview`、`lint`（`package.json:6`）。

## 为此项目编写代码的建议（AI 编码规范）
- 严格遵守 `IRenderer` 与 `Widget` 约定：任何新渲染器或组件都必须实现接口并注册类型。
- 新增 Widget 的步骤：
  - 创建子类，实现 `createChildWidget`、`performLayout`、`paintSelf`、必要的约束与定位方法。
  - 在静态初始化中调用 `Widget.registerType('<TypeName>', Class)`，确保与 JSON `type` 一致。
  - 若需要在演示环境自动注册，确认在 `src/core/registry.ts` 有侧向 import 以触发静态注册。
- 绘制坐标处理：在 `paintSelf` 中使用相对坐标（0,0）；子项偏移由基类统一管理。
- 布局策略：优先基于约束与子项尺寸推导自身尺寸，避免在未确定自身尺寸时计算子项绝对位置。
- 处理图片与文本：
  - 图片需考虑 `fit` 与 `alignment`（`src/core/image.ts:177`）。
  - 文本需进行行分割与省略号处理，并保证与约束一致（`src/core/text.ts:134`、`src/core/text.ts:176`）。
- 错误与日志：沿用当前日志与错误风格，尽量在问题发生处提供清晰的中文提示与栈信息。

## 开发与测试
- 演示页面：`src/test/test-page.tsx` 提供“完整流程测试”与“渲染器测试”两套路径。
  - 渲染器选择与初始化参见 `src/test/test-page.tsx:147`～`src/test/test-page.tsx:155`。
  - 完整流程（Build → Layout → Paint）参见 `src/test/test-page.tsx:163`～`src/test/test-page.tsx:172`。
- 本地分辨率设置：`LOCAL_RESOLUTION` 用于渲染分辨率（`src/utils/localStorage.ts:92`）。

## 扩展点
- 可新增渲染器实现，遵循 `IRenderer` 并在编辑器中选择。
- 可扩充 Widget 类型（如形状、路径、富文本），遵循现有布局与绘制契约。
- 可为布局系统补充更多对齐、约束组合与错误诊断文本。

---
此提示旨在让 AI 助手快速理解项目结构与编码约束，从而安全、正确地进行协作开发与功能扩充。