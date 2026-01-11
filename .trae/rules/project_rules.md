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

### Framework Core
- **Inheritance**: `StatelessWidget` | `StatefulWidget` | `RenderObjectWidget`.
- **Naming**: PascalCase.
- **Perf**: Zero alloc in `build`/`paint`.
- **Ref**: `CustomComponentType` enum only.

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
