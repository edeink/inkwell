# Wiki Demo

## 目标

用 Inkwell 实现一个“多篇 Markdown 文档 + 左侧目录树 + 右侧文章与标题目录”的 Wiki Demo。

## 目录结构

- `index.tsx`：React 容器入口，负责创建 Canvas 并在运行时就绪后启动 Inkwell 应用
- `app.tsx`：Inkwell 入口，负责按需加载 Markdown，并渲染 Wiki 主组件
- `helpers/wiki-doc.ts`：侧边栏配置类型、目录展开解析、Markdown 动态加载工具
- `raw/`：所有 Markdown 原始文件（支持多级目录）
- `raw/sidebar.ts`：目录树配置（层级、中文标题、文档 id）
- `widgets/`：所有 Inkwell Widget 组件实现

## 关键组件

- `widgets/wiki-app`：整体布局与状态聚合（当前文档、左栏宽度）
- `widgets/wiki-sidebar`：左侧文档树（支持展开/收起、选中高亮）
- `widgets/wiki-toc`：右侧文章目录（基于 Markdown 标题生成并支持跳转）
- `widgets/fstate-widget`：本 Demo 内部的状态组件基类，用于统一 state 初始化方式

## 后续开发约定

- 新增文档：
  - 在 `raw/` 下新增 Markdown 文件
  - 在 `raw/sidebar.ts` 中新增对应 `doc` 条目（`id` 用相对路径去掉扩展名，例如 `guide/getting-started`），并填写 `label` 作为侧边栏展示文本
- 目录树展示：以 `raw/sidebar.ts` 的 `category.label` / `doc.label` 为准，不依赖读取 Markdown 标题
- 文档加载：点击文档时才加载对应 Markdown 内容，避免首次进入读取全部文件
- 兼容环境：同一份 `app.tsx` 同时兼容 Vite 与 Docusaurus，通过 `import('*.markdown?raw')` 加载原始文本
