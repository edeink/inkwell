# 部件画廊

该目录仅用于展示 `src/core` 的内容，用于集中验证核心 Widget、布局与事件能力。

- 入口：`index.tsx`
- 应用逻辑：`app.tsx`
- 组件实现：`widgets/`

## 约定

- 只允许引用 `src/core`（以及 demo 内部的展示辅助组件）。
- 不允许引用 `src/comp`，组件库展示统一放到 `src/demo/comp-gallery`。
