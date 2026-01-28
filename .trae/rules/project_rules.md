# 中文语言要求 (Chinese Only)
1. **原则**：注释、测试描述、日志、文档等均须用**中文**。
2. **例外**：专有术语和API。

# Project Rules (@edeink/inkwell)
High-perf canvas UI framework. Stack: Vite, Less, Vitest, Docusaurus.

## 1. Architecture
- `src/core`: Widgets, Elements, RenderObjects, Events.
- `src/runtime`: Loop & Scheduler.
- `src/renderer`: `Canvas2DRenderer`.
- `src/utils/compiler`: JSX compiler.
- `src/demo`: Examples.
- `src/devtools`: Debug tools.

## 2. Coding Standards
### React Components
- **File**: `kebab-case/index.{tsx,module.less}`.
- **Style**: `classnames`, CSS Modules, Strict TS (enums).

### Demo 代码组织（Widget / React）
- **入口文件**：每个 Demo 目录仅允许 `index.tsx`（React 入口）与 `app.tsx`（Widget 入口）位于目录根部。
- **Widget 文件**：除 `app.tsx` 外，新的 Widget 必须放在 `widgets/<name>/index.tsx`，且一个文件仅一个 Widget。
- **React 文件**：除 `index.tsx` 外，新的 React 组件必须放在 `components/<name>/index.tsx`，且一个文件仅一个 React 组件。
- **Helpers**：可复用的辅助函数/工具逻辑必须放在 `helpers/`。
- **README**：每个 Demo 子目录必须包含 `README.md`，用于简单介绍该 Demo，便于快速理解。

### 测试代码（Widget JSX）
- **目标**：当单测需要表达 Widget 树结构时，优先用 Widget JSX 提升可读性。
- **文件**：优先使用 `.spec.tsx/.test.tsx` 承载 JSX（避免在 `.ts` 中塞大量手写树）。
- **Pragma**：文件顶部使用 `/** @jsxImportSource @/utils/compiler */`。
- **构建**：使用 `compileElement(<App />)` 生成数据，再用 `WidgetRegistry.createWidget(data)` + `root.createElement(data)` 挂载。
- **引用**：需要拿到实例时用 `ref={(w) => { ... }}` 捕获，不要手动拼 `children`/`parent` 关系。
- **禁止手写类型字段**：测试中避免手写 `__inkwellType`（让 JSX 编译产物注入）；仅在“测试 Registry/解析器/深层性能树”等场景下保留手写数据更合适时例外。

### Framework Core
- **Inheritance**: `StatelessWidget` | `StatefulWidget` | `RenderObjectWidget`.
- **Naming**: PascalCase.
- **Perf**: Zero alloc in `build`/`paint`.
- **Ref**: `CustomComponentType` enum only.

### Events
- **原则**：事件系统中常见字符串（事件类型、阶段、标记、后缀等）统一集中为常量再引用。
- **范围**：`src/core/events`、`src/utils/compiler/jsx-compiler.ts`。
- **来源**：`src/core/events/constants.ts`。
- **说明**：该约定以可维护性/一致性为主；字符串比较性能以基准输出为参考，不做强保证。

## 3. Performance
### Test
- **Limit**: **< 1s**/case.
- **Tips**: Mock deps, reduce scale, no anims (`frames: 0`).

### DOM
- **Ops**: Batch R/W, `DocumentFragment`, CSS toggle.
- **List**: Virtualize >100 items.

## 4. AI Guidelines
**Role**: Senior Core Engineer.

### Workflows
1. **Widget**: `src/core` impl -> `RenderObject` -> `docs/widgets`.
2. **Debug**: Check `Canvas2DRenderer`, `paint`, `src/devtools`.
3. **Opt**: Min layout/paint, verify `markNeeds*`, tests <1s.
4. **Lang**: **Strictly Chinese** (comments/tests/docs).

### Critical Files
- `src/core/base.ts`
- `src/runtime/index.tsx`
- `src/core/events/dispatcher.ts`
