# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Benchmark
- **Refactor**: Centralized DOM stage cleanup logic into `clearDomStage` utility in `src/benchmark/metrics/dom.tsx`.
- **Refactor**: Removed redundant stage clearing code from individual DOM benchmark testers (`pipeline`, `absolute`, `flex`, `scroll`, `text`).
- **Fix**: Aligned `Layout` benchmark DOM implementation with Widget implementation:
  - Added white background to root container.
  - Changed spacing implementation to `gap: 2px` (from margins) to strictly match `Wrap` behavior.
  - Adopted `box-sizing: border-box` across all nodes to match Flutter's explicit sizing model.
  - Added `position: relative` to even nodes to correctly anchor `Stack/Positioned` children.
  - Updated leaf node to use `width/height: 100%` to correctly simulate constrained layout behavior.
- **Feat**: Implemented adaptive layout for `State` benchmark DOM (`src/benchmark/tester/state/dom.tsx`):
  - Added dynamic item sizing based on available viewport.
  - Implemented intelligent pagination/scrolling when items exceed capacity.
  - Lowered minimum item size to 4px (aligned with Flex benchmark) to support high-density tests.
- **Docs**: Added `docs/reports/layout_style_alignment.md` detailing style comparison and adjustments.
- **Test**: Added unit tests for `clearDomStage`, `createLayoutDomNodes`, and `createStateDomNodes` in `src/benchmark/metrics/__tests__/dom.test.ts`.

### Devtools
- **Refactor**: 收敛 DevTools 字符串常量到 `src/devtools/constants.ts`，统一事件名、存储键、DOM 事件/选择器与 UI 文案。
- **Refactor**: DevTools localStorage 读写统一迁移到 `safeReadStorage/safeWriteStorage`，移除散落的 try/catch。
- **Test**: 补齐 `safeReadStorage/safeWriteStorage` 单测，覆盖正常、异常与无 localStorage 场景。
